import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("fund.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL,
    monthly_amount INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    role_id INTEGER,
    monthly_amount INTEGER,
    status TEXT DEFAULT 'Active',
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'Not Paid',
    payment_date TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'Income' or 'Expense'
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_by TEXT DEFAULT 'Admin'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed initial roles if empty
const rolesCount = db.prepare("SELECT COUNT(*) as count FROM roles").get() as { count: number };
if (rolesCount.count === 0) {
  const insertRole = db.prepare("INSERT INTO roles (role_name, monthly_amount) VALUES (?, ?)");
  insertRole.run("Trưởng phòng", 500000);
  insertRole.run("Phó phòng", 400000);
  insertRole.run("Chuyên viên cao cấp", 300000);
  insertRole.run("Chuyên viên chính", 250000);
  insertRole.run("Chuyên viên", 200000);
}

// Seed initial settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("low_balance_threshold", "2000000");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("qr_image", "");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  // --- API Routes ---

  // Roles
  app.get("/api/roles", (req, res) => {
    try {
      const roles = db.prepare("SELECT * FROM roles").all();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roles", (req, res) => {
    try {
      const { role_name, monthly_amount } = req.body;
      const result = db.prepare("INSERT INTO roles (role_name, monthly_amount) VALUES (?, ?)").run(role_name, monthly_amount);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/roles/:id", (req, res) => {
    try {
      const { role_name, monthly_amount } = req.body;
      db.prepare("UPDATE roles SET role_name = ?, monthly_amount = ? WHERE id = ?").run(role_name, monthly_amount, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/roles/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM roles WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Members
  app.get("/api/members", (req, res) => {
    try {
      const members = db.prepare(`
        SELECT m.*, r.role_name, 
        (SELECT payment_status FROM payments WHERE member_id = m.id AND month = ? AND year = ?) as current_payment_status
        FROM members m
        LEFT JOIN roles r ON m.role_id = r.id
      `).all(new Date().getMonth() + 1, new Date().getFullYear());
      
      const membersWithStats = members.map((m: any) => {
          const totalPaid = db.prepare("SELECT SUM(monthly_amount) as total FROM payments p JOIN members m2 ON p.member_id = m2.id WHERE p.member_id = ? AND p.payment_status = 'Paid'").get(m.id) as { total: number };
          return { ...m, total_paid: totalPaid.total || 0 };
      });

      res.json(membersWithStats);
    } catch (error: any) {
      console.error("Error in /api/members:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/members", (req, res) => {
    try {
      const { full_name, role_id, monthly_amount, status } = req.body;
      const result = db.prepare("INSERT INTO members (full_name, role_id, monthly_amount, status) VALUES (?, ?, ?, ?)").run(full_name, role_id, monthly_amount, status);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/members/:id", (req, res) => {
    try {
      const { full_name, role_id, monthly_amount, status } = req.body;
      db.prepare("UPDATE members SET full_name = ?, role_id = ?, monthly_amount = ?, status = ? WHERE id = ?").run(full_name, role_id, monthly_amount, status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/members/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
      db.prepare("DELETE FROM payments WHERE member_id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payments
  app.post("/api/payments/toggle", (req, res) => {
    try {
      const { member_id, month, year } = req.body;
      const existing = db.prepare("SELECT * FROM payments WHERE member_id = ? AND month = ? AND year = ?").get(member_id, month, year) as any;

      if (existing) {
        const newStatus = existing.payment_status === 'Paid' ? 'Not Paid' : 'Paid';
        const date = newStatus === 'Paid' ? new Date().toISOString() : null;
        db.prepare("UPDATE payments SET payment_status = ?, payment_date = ? WHERE id = ?").run(newStatus, date, existing.id);
        
        // If marked as paid, we should probably add an income transaction
        if (newStatus === 'Paid') {
            const member = db.prepare("SELECT * FROM members WHERE id = ?").get(member_id) as any;
            db.prepare("INSERT INTO transactions (type, description, amount, date) VALUES (?, ?, ?, ?)").run(
                'Income', 
                `Đóng góp hàng tháng - ${member.full_name} (${month}/${year})`, 
                member.monthly_amount, 
                new Date().toISOString()
            );
        } else {
            // If marked as unpaid, we should probably remove the corresponding transaction
            const member = db.prepare("SELECT * FROM members WHERE id = ?").get(member_id) as any;
            db.prepare("DELETE FROM transactions WHERE type = 'Income' AND description = ?").run(`Đóng góp hàng tháng - ${member.full_name} (${month}/${year})`);
        }
      } else {
        const date = new Date().toISOString();
        const member = db.prepare("SELECT * FROM members WHERE id = ?").get(member_id) as any;
        db.prepare("INSERT INTO payments (member_id, month, year, payment_status, payment_date) VALUES (?, ?, ?, 'Paid', ?)").run(member_id, month, year, date);
        
        db.prepare("INSERT INTO transactions (type, description, amount, date) VALUES (?, ?, ?, ?)").run(
            'Income', 
            `Đóng góp hàng tháng - ${member.full_name} (${month}/${year})`, 
            member.monthly_amount, 
            date
        );
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transactions
  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", (req, res) => {
    try {
      const { type, description, amount, date } = req.body;
      const result = db.prepare("INSERT INTO transactions (type, description, amount, date) VALUES (?, ?, ?, ?)").run(type, description, amount, date);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all() as any[];
      const settingsObj = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      const { key, value } = req.body;
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const totalIncome = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Income'").get() as { total: number };
      const totalExpense = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Expense'").get() as { total: number };
      const balance = (totalIncome.total || 0) - (totalExpense.total || 0);

      const members = db.prepare("SELECT id, monthly_amount FROM members WHERE status = 'Active'").all() as any[];
      const expected = members.reduce((sum, m) => sum + (m.monthly_amount || 0), 0);
      
      const paidCount = db.prepare("SELECT COUNT(*) as count FROM payments WHERE month = ? AND year = ? AND payment_status = 'Paid'").get(month, year) as { count: number };
      const collected = db.prepare("SELECT SUM(m.monthly_amount) as total FROM payments p JOIN members m ON p.member_id = m.id WHERE p.month = ? AND p.year = ? AND p.payment_status = 'Paid'").get(month, year) as { total: number };

      res.json({
        balance,
        collected: collected.total || 0,
        expected,
        paidCount: paidCount.count,
        unpaidCount: members.length - paidCount.count,
        totalIncome: totalIncome.total || 0,
        totalExpense: totalExpense.total || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
