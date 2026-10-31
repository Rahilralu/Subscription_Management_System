import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const transport = nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort })

export function sendMail({ to, subject, text, html, attachments }) {
  return transport.sendMail({ from: env.mailFrom, to, subject, text, html, attachments })
}
