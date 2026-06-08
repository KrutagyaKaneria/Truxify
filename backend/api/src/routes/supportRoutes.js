import express from 'express';
import { supabase } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const FAQ_COLUMNS = 'id, question, answer, app_type, sort_order';
const TICKET_COLUMNS = 'id, subject, description, category, status, created_at';

function normalizeRequiredText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// ============================================================================
// 1. LIST ACTIVE FAQS (PUBLIC)
// ============================================================================
router.get('/faqs', async (req, res) => {
  const appType = normalizeRequiredText(req.query.app_type);

  try {
    let query = supabase
      .from('faqs')
      .select(FAQ_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (appType) {
      query = query.in('app_type', [appType, 'both']);
    }

    const { data: faqs, error } = await query;

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch FAQs.',
        details: error.message,
      });
    }

    res.json(faqs || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// 2. CREATE SUPPORT TICKET (AUTHENTICATED USER)
// ============================================================================
router.post('/tickets', authenticate, async (req, res) => {
  const subject = normalizeRequiredText(req.body.subject);
  const category = normalizeRequiredText(req.body.category);
  const description = normalizeRequiredText(req.body.description) || subject;

  if (!subject || !category) {
    return res.status(400).json({
      error: 'subject and category are required.',
    });
  }

  // Map user-friendly/frontend categories to database-constrained values
  const CATEGORY_MAP = {
    billing: 'payment',
    booking: 'order',
    payment: 'payment',
    order: 'order',
    technical: 'technical',
    general: 'general',
    account: 'account'
  };

  const normalizedCategory = category.toLowerCase();
  const dbCategory = CATEGORY_MAP[normalizedCategory] || 'general';

  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: req.user.id,
        subject,
        description,
        category: dbCategory,
        status: 'open',
      })
      .select(TICKET_COLUMNS)
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Failed to create support ticket.',
        details: error.message,
      });
    }

    res.status(201).json({
      message: 'Support ticket created successfully.',
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// 3. LIST CURRENT USER'S SUPPORT TICKETS (AUTHENTICATED USER)
// ============================================================================
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(TICKET_COLUMNS)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch support tickets.',
        details: error.message,
      });
    }

    res.json(tickets || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
