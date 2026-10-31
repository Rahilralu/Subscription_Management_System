import * as authService from './auth.service.js'

export async function login(req, res) {
  res.json({ data: await authService.login(req.valid.body) })
}

export async function signup(req, res) {
  res.status(201).json({ data: await authService.signup(req.valid.body) })
}

export async function forgotPassword(req, res) {
  await authService.forgotPassword(req.valid.body)
  res.json({ data: { ok: true } })
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.valid.body)
  res.json({ data: { ok: true } })
}

export async function me(req, res) {
  res.json({ data: await authService.getMe(req.user.sub) })
}
