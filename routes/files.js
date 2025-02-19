import express from 'express';
import File from '../models/File.js';

const router = express.Router();

// 获取所有文件信息
router.get('/', async (req, res) => {
  try {
    const files = await File.findAll();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// 获取单个文件信息
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get the file' });
  }
});

// 创建新文件
router.post('/', async (req, res) => {
  const { name, size, type, md5 } = req.body;
  try {
    const newFile = await File.create({ name, size, type, md5 });
    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create the file' });
  }
});

// 更新文件信息
router.put('/:id', async (req, res) => {
  const { name, size, type, md5 } = req.body;
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    await file.update({ name, size, type, md5 });
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update the file' });
  }
});

// 删除文件
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    await file.destroy();
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete the file' });
  }
});

export default router;
