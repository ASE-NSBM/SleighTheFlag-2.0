import "server-only";

/**
 * Settings that must NOT be shipped to every visitor's browser.
 * This file can only be imported by server code.
 */

/**
 * WhatsApp group for registered teams. It is sent to the browser only in the
 * reply to a successful registration, so it is not readable from the public
 * page. Set WHATSAPP_GROUP_URL in the environment to change it without a code
 * change; set it to "off" to stop showing a link.
 */
const configured = (process.env.WHATSAPP_GROUP_URL ?? "https://chat.whatsapp.com/BI5WJn0A5lUIANE0CYPPZq").trim();

export const whatsappGroupUrl: string | null = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(configured) ? configured : null;
