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
    const { name, risk } = req.body;
    if (!name || !risk) {
        return res.status(400).json({ error: 'Nome e risco são obrigatórios!' });
    }
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
    const { name, risk } = req.body;
    if (!name && !risk) {
        return res.status(400).json({ error: 'Nome ou risco devem ser fornecidos para atualização!' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (name) {
        updateFields.push("name = ?");
        updateValues.push(name);
    }
    if (risk) {
        updateFields.push("risk = ?");
        updateValues.push(risk);
    }
    
    updateValues.push(id);
    
    const query = `UPDATE locations SET ${updateFields.join(", ")} WHERE id = ?`;
    
    db.run(query, updateValues, function(err) {
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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
