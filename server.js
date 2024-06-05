const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('locations.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS locations ( id INTEGER PRIMARY KEY, name TEXT, risk TEXT);");
});

app.use(express.json());

app.post('/locations', (req, res) => {
    const { name } = req.body;
    const { risk } = req.body;
    db.run("INSERT INTO locations (name, risk) VALUES (?, ?)", [name, risk], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, name, risk });
    });
});

app.get('/locations', (req, res) => {
    db.all("SELECT * FROM locations", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(rows);
    });
});


app.get('/locations/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM locations WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.status(200).json(row);
        } else {
            res.status(404).json({ error: 'Local não encontrado!' });
        }
    });
});

app.put('/locations/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.run("UPDATE locations SET local = ? WHERE id = ?", [name, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes) {
            res.status(200).json({ message: 'Local atualizado com sucesso!' });
        } else {
            res.status(404).json({ error: 'Local não encontrado!' });
        }
    });
});

app.delete('/locations/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM locations WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes) {
            res.status(200).json({ message: 'Local removido com sucesso!' });
        } else {
            res.status(404).json({ error: 'Local não encontrado!' });
        }
    });
});

// Inicie o servidor Express
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});