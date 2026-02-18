import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email or password'
      }
    });
  }

  const { email, password } = result.data;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message
      }
    });
  }

  res.status(200).json({
    session: data.session
  });
});

router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    const decoded = jwt.decode(token) as { sub?: string } | null;
    if (decoded?.sub) {
      await supabaseAdmin.auth.admin.signOut(decoded.sub);
    }
  }

  res.status(200).json({ message: 'Logged out' });
});

export default router;
