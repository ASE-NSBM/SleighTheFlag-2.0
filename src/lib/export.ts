import "server-only";
import { deflateRawSync } from "node:zlib";
import { event, TIMEZONE } from "@/config/event";
import { formatPhone, isPersonalEmail } from "./validation";
import type { Team } from "./types";

/**
 * Exports for the admin panel: a real Excel workbook (two sheets), CSV and JSON.
 * The workbook is written by hand (a tiny ZIP + SpreadsheetML writer) so the
 * project needs no spreadsheet dependency.
 */

type Cell = string | number;

export interface Sheet {
  name: string;
  columns: { header: string; width: number }[];
  rows: Cell[][];
}

/* ───────────────────────────── tables ───────────────────────────────── */

const stamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function localStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = Object.fromEntries(stamp.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

const label = (status: Team["status"]) => status.charAt(0).toUpperCase() + status.slice(1);

export function teamsSheet(teams: Team[]): Sheet {
  const slots = Math.max(event.team.maxSize, ...teams.map((team) => team.members.length));
  const columns: Sheet["columns"] = [
    { header: "Code", width: 14 },
    { header: "Team name", width: 26 },
    { header: "University", width: 38 },
    { header: "Status", width: 11 },
    { header: "Members", width: 10 },
  ];
  for (let i = 0; i < slots; i++) {
    const who = i === 0 ? "Leader" : `Member ${i + 1}`;
    columns.push(
      { header: `${who} name`, width: 26 },
      { header: `${who} student ID`, width: 18 },
      { header: `${who} email`, width: 32 },
      { header: `${who} contact`, width: 18 },
    );
  }
  columns.push({ header: "Registered (Sri Lanka time)", width: 24 }, { header: "Added by", width: 12 }, { header: "Notes", width: 40 });

  const rows = teams.map((team) => {
    const row: Cell[] = [team.code, team.name, team.university, label(team.status), team.members.length];
    for (let i = 0; i < slots; i++) {
      const member = team.members[i];
      row.push(member?.fullName ?? "", member?.studentId ?? "", member?.email ?? "", member ? formatPhone(member.phone) : "");
    }
    row.push(localStamp(team.createdAt), team.source === "admin" ? "Organiser" : "Public form", team.notes);
    return row;
  });

  return { name: "Teams", columns, rows };
}

export function participantsSheet(teams: Team[]): Sheet {
  const columns: Sheet["columns"] = [
    { header: "Team code", width: 14 },
    { header: "Team name", width: 26 },
    { header: "University", width: 38 },
    { header: "Team status", width: 13 },
    { header: "Role", width: 10 },
    { header: "Full name", width: 28 },
    { header: "Student ID", width: 18 },
    { header: "Email", width: 34 },
    { header: "Email type", width: 12 },
    { header: "Contact", width: 18 },
    { header: "Registered (Sri Lanka time)", width: 24 },
  ];
  const rows: Cell[][] = [];
  for (const team of teams) {
    for (const member of team.members) {
      rows.push([
        team.code,
        team.name,
        team.university,
        label(team.status),
        member.isLeader ? "Leader" : "Member",
        member.fullName,
        member.studentId,
        member.email,
        isPersonalEmail(member.email) ? "Personal" : "University",
        formatPhone(member.phone),
        localStamp(team.createdAt),
      ]);
    }
  }
  return { name: "Participants", columns, rows };
}

/* ─────────────────────────────── CSV ────────────────────────────────── */

const PLAIN_PHONE = /^\+\d[\d ]{6,20}$/;

/**
 * Team names are attacker-controlled and this file is opened in Excel by an
 * organiser, so neutralise anything a spreadsheet would run as a formula.
 */
function csvCell(value: Cell): string {
  let text = typeof value === "number" ? String(value) : value;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !PLAIN_PHONE.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(sheet: Sheet): string {
  const lines = [sheet.columns.map((column) => csvCell(column.header)).join(",")];
  for (const row of sheet.rows) lines.push(row.map(csvCell).join(","));
  // BOM so Excel reads UTF-8 (Sinhala / Tamil names) correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/* ─────────────────────────────── XLSX ───────────────────────────────── */

const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function cellXml(value: Cell, ref: string, style: number): string {
  const s = style ? ` s="${style}"` : "";
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`;
  const text = String(value);
  if (text === "") return style ? `<c r="${ref}"${s}/>` : "";
  // Inline strings are stored as text: Excel never evaluates them as formulas.
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const lastColumn = columnName(Math.max(0, sheet.columns.length - 1));
  const lastRow = sheet.rows.length + 1;
  const cols = sheet.columns.map((column, i) => `<col min="${i + 1}" max="${i + 1}" width="${column.width}" customWidth="1"/>`).join("");
  const header = `<row r="1" ht="20" customHeight="1">${sheet.columns.map((column, i) => cellXml(column.header, `${columnName(i)}1`, 1)).join("")}</row>`;
  const body = sheet.rows
    .map((row, r) => `<row r="${r + 2}">${row.map((value, c) => cellXml(value, `${columnName(c)}${r + 2}`, 0)).join("")}</row>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastColumn}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="16"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${header}${body}</sheetData>` +
    `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` +
    `</worksheet>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF14613A"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/* A minimal ZIP writer (deflate, no zip64) — enough for a workbook. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; data: string }[], date: Date): Buffer {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  const chunks: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const raw = Buffer.from(file.data, "utf8");
    const packed = deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42); // local header offset (bytes 30–41 stay zero)

    chunks.push(local, name, packed);
    directory.push(central, name);
    offset += local.length + name.length + packed.length;
  }

  const directorySize = directory.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, ...directory, end]);
}

export function toXlsx(sheets: Sheet[]): Buffer {
  const files = [
    {
      name: "[Content_Types].xml",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        sheets
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join("") +
        `</Types>`,
    },
    {
      name: "_rels/.rels",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
        `</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join("") +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: "xl/styles.xml", data: STYLES_XML },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(sheet) })),
  ];
  return zip(files, new Date());
}

/* ─────────────────────────────── JSON ───────────────────────────────── */

export function toJson(teams: Team[]): string {
  return JSON.stringify(
    {
      event: event.fullName,
      exportedAt: new Date().toISOString(),
      count: teams.length,
      teams: teams.map((team) => ({
        code: team.code,
        name: team.name,
        university: team.university,
        status: team.status,
        registeredAt: team.createdAt,
        source: team.source,
        notes: team.notes,
        members: team.members.map((member) => ({
          role: member.isLeader ? "leader" : "member",
          fullName: member.fullName,
          studentId: member.studentId,
          email: member.email,
          phone: member.phone,
        })),
      })),
    },
    null,
    2,
  );
}
