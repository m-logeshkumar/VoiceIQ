import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Score } from '../models/Score.js';

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college,
    avatar: user.avatar || user.name.charAt(0).toUpperCase(),
    streak: user.streak,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function signup(req, res) {
  const { name, email, password, college = '', role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required' });
  }

  if (role && role !== 'student') {
    return res.status(403).json({ message: 'Admin signup is not allowed' });
  }

  if (env.adminEmail && email.toLowerCase() === env.adminEmail.toLowerCase()) {
    return res.status(403).json({ message: 'Admin signup is not allowed. Use admin login.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'student',
    college,
    avatar: name.charAt(0).toUpperCase(),
    streak: 0,
  });

  return res.status(201).json({ user: toSafeUser(user), token: createToken(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  return res.json({ user: toSafeUser(user), token: createToken(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ user: toSafeUser(user) });
}

export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ users: users.map(toSafeUser) });
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Admin user deletion is not allowed' });
  }

  await User.findByIdAndDelete(id);
  await Score.deleteMany({ userId: id });

  return res.status(204).send();
}
