import { list, put } from '@vercel/blob';

const FILE = 'html-tool-hub/tools.json';

async function readTools() {
  const r = await list({ prefix: FILE, limit: 10 });
  const b = r.blobs.find(x => x.pathname === FILE);
  if (!b) return [];
  const res = await fetch(b.url, { cache: 'no-store' });
  return res.ok ? await res.json() : [];
}
async function writeTools(tools) {
  await put(FILE, JSON.stringify(tools, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  try {
    if (req.method === 'GET') return res.status(200).json(await readTools());
    if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
    const { action, tool, id } = req.body || {};
    let tools = await readTools();
    if (action === 'add') {
      if (!tool?.name || !tool?.url) return res.status(400).json({error:'Name und URL erforderlich'});
      const clean = { id: tool.id || crypto.randomUUID(), name:String(tool.name), url:String(tool.url), cat:String(tool.cat||''), storage:['local','online','none'].includes(tool.storage)?tool.storage:'local', visibility:tool.visibility==='private'?'private':'public', note:String(tool.note||'') };
      tools.push(clean);
    } else if (action === 'visibility') {
      const t=tools.find(x=>x.id===id); if(!t) return res.status(404).json({error:'Tool nicht gefunden'});
      t.visibility = req.body.visibility === 'private' ? 'private' : 'public';
    } else if (action === 'delete') {
      tools = tools.filter(x=>x.id!==id);
    } else return res.status(400).json({error:'Ungültige Aktion'});
    await writeTools(tools);
    return res.status(200).json(tools);
  } catch(e) {
    console.error(e);
    return res.status(500).json({error:'Zentrale Speicherung ist noch nicht eingerichtet. Vercel Blob Storage verbinden.'});
  }
}