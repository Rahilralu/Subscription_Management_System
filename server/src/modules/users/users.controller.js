import * as usersService from './users.service.js'

export async function list(req, res) {
  res.json({ data: await usersService.listUsers(req.valid.query) })
}

export async function create(req, res) {
  res.status(201).json({ data: await usersService.createUser(req.user.sub, req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await usersService.updateUser(req.user.sub, req.valid.params.id, req.valid.body) })
}
