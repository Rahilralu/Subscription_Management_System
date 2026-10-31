import * as authService from './auth.service.js'

export async function login(req, res) {
  res.json({ data: await authService.login(req.valid.body) })
}

export async function me(req, res) {
  res.json({ data: await authService.getMe(req.user.sub) })
}
