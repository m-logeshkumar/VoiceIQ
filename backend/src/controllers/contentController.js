import { AssessmentContent } from '../models/AssessmentContent.js';

export async function getByType(req, res) {
  const { type } = req.params;
  const items = await AssessmentContent.find({ type }).sort({ createdAt: -1 });
  return res.json({ items });
}

export async function createContent(req, res) {
  const { type } = req.params;
  const payload = { ...req.body, type };
  const created = await AssessmentContent.create(payload);
  return res.status(201).json({ item: created });
}

export async function deleteContent(req, res) {
  const { id } = req.params;
  await AssessmentContent.findByIdAndDelete(id);
  return res.status(204).send();
}
