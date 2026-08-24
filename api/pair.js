// api/pair.js
// Proxy HTTPS -> HTTP vers l'API KataBump. Répond quasi instantanément
// (la génération du code se fait en tâche de fond côté serveur, voir /api/code).

const KATABUMP_API = 'http://51.75.118.151:20269';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Méthode non autorisée.' });
    }

    try {
        const response = await fetch(`${KATABUMP_API}/api/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Erreur proxy vers KataBump :', err.message);
        res.status(502).json({ success: false, message: 'Le serveur de pairing est injoignable pour le moment.' });
    }
}
