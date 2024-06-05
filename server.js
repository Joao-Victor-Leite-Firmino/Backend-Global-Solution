const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const app = express();
const PORT = 3000;

const db = new sqlite3.Database('locations.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS locations ( id INTEGER PRIMARY KEY, name TEXT, risk TEXT);");
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT)");
});

app.use(express.json());
app.use(cors());

const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ error: 'Nenhum token fornecido.' });
    }
    jwt.verify(token.split(' ')[1], 'secreto', (err, decoded) => {
        if (err) {
            return res.status(500).json({ error: 'Falha ao autenticar o token.' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

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

app.post('/registro', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const usuarioExistente = await buscarUsuario(username);
        if (usuarioExistente) {
            return res.status(400).json({ error: 'Usuário já registrado' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await criarUsuario(username, hashedPassword, role);
        res.status(201).json({ message: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro no registro de usuário' });
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const usuario = await buscarUsuario(username);
        if (!usuario) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }
        const senhaValida = await bcrypt.compare(password, usuario.password);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }
        const token = jwt.sign({ id: usuario.id, username: usuario.username, role: usuario.role }, 'secreto', { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro no login de usuário' });
    }
});


const buscarUsuario = (username) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
};


const criarUsuario = (username, password, role) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', [username, password, role], (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
