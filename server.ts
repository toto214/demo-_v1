import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import os from "os";

dotenv.config();

// Supabase Configuration
const rawSupabaseUrl = process.env.SUPABASE_URL || "";
// Clean URL: Remove /rest/v1/ or trailing slashes if user provided them
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is missing. Database features will not work.");
}

let supabase: any = null;
let supabaseStorageClient: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseStorageClient = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase;
    
    // Proactively attempt to create the public bucket 'product-images' if it doesn't exist
    if (supabaseStorageClient) {
      supabaseStorageClient.storage.createBucket("product-images", {
        public: true,
        fileSizeLimit: 5242880 // 5MB limit
      }).then(({ data, error }: any) => {
        if (error) {
          if (error.message && error.message.includes("already exists")) {
            console.log("📦 Supabase Storage bucket 'product-images' already exists.");
          } else {
            console.warn("⚠️ Proactive creation of 'product-images' bucket skipped/failed:", error.message);
          }
        } else {
          console.log("✅ Successfully created public Supabase Storage bucket 'product-images'!");
        }
      }).catch((err: any) => {
        console.warn("⚠️ Exception during database bucket check:", err.message || err);
      });
    }
  } catch (e: any) {
    console.error("❌ Failed to initialize Supabase client:", e.message || e);
  }
}

// Ensure uploads directory exists
const isVercel = !!process.env.VERCEL;
const UPLOADS_DIR = isVercel ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn("⚠️ Failed to create uploads directory:", err.message || err);
}

// Config Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Intercept all API calls and return a friendly error if Supabase isn't configured
app.use("/api", (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({
      error: "Database Connection Error",
      message: "Supabase environment variables (SUPABASE_URL and SUPABASE_ANON_KEY) are missing or invalid on Vercel. Please add them in your Vercel Project Settings > Environment Variables."
    });
  }
  next();
});

// --- API Routes ---

// Connection Test Endpoint
app.get("/api/db-test", async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    res.json({ status: "connected", message: "Supabase connection is working!", data });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

  // File Upload Route
  app.post("/api/upload", (req, res, next) => {
    try {
      const uploadFn = upload.single("image");
      uploadFn(req, res, (err) => {
        if (err) {
          console.error("❌ Multer storage/upload error:", err);
          return res.status(500).json({ error: "Multer upload failed", details: err.message || err });
        }
        next();
      });
    } catch (err: any) {
      console.error("❌ Multer execution exception:", err);
      res.status(500).json({ error: "Multer initialization failed", details: err.message || err });
    }
  }, async (req: any, res) => {
    try {
      if (!req.file) {
        console.warn("⚠️ No file received in /api/upload");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. Try to upload to Supabase Storage if configured
      if (supabaseUrl && supabaseAnonKey) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const fileName = `${Date.now()}-${req.file.filename || req.file.originalname}`;
          
          const { data, error } = await supabaseStorageClient.storage
            .from("product-images")
            .upload(fileName, fileBuffer, {
              contentType: req.file.mimetype,
              upsert: true
            });

          if (!error) {
            const { data: publicUrlData } = supabaseStorageClient.storage
              .from("product-images")
              .getPublicUrl(fileName);
              
            if (publicUrlData && publicUrlData.publicUrl) {
              console.log("☁️ Successfully uploaded to Supabase Storage:", publicUrlData.publicUrl);
              
              // Clean up the local temp file after cloud upload succeeds
              try {
                fs.unlinkSync(req.file.path);
              } catch (e) {
                console.warn("⚠️ Failed to delete local temp file:", e);
              }
              
              return res.json({ imageUrl: publicUrlData.publicUrl });
            }
          } else {
            console.warn("⚠️ Supabase Storage upload failed, falling back to local file. Error:", error.message);
            if (error.message && error.message.includes("row-level security")) {
              console.warn("💡 TIP: To fix the row-level security error, you can either:\n" +
                "1. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables to bypass RLS on the server.\n" +
                "2. Or go to Supabase Dashboard > Storage > product-images > Policies, and create an INSERT policy allowing 'public/anonymous' or authenticated uploads.");
            }
          }
        } catch (storageErr: any) {
          console.warn("⚠️ Error uploading to Supabase Storage bucket:", storageErr.message || storageErr);
        }
      }

      // 2. Fallback to local uploads path or Base64 (for serverless environments)
      if (isVercel) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Data = fileBuffer.toString("base64");
          const base64Url = `data:${req.file.mimetype || 'image/jpeg'};base64,${base64Data}`;
          console.log("✅ Serverless Fallback: Converted uploaded file to Base64 URL.");
          
          // Clean up the local temp file after converting
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {
            console.warn("⚠️ Failed to delete local temp file after Base64 conversion:", e);
          }
          
          return res.json({ imageUrl: base64Url });
        } catch (base64Err: any) {
          console.error("🔥 Serverless Base64 conversion failed:", base64Err);
        }
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      console.log("✅ File uploaded locally:", imageUrl);
      res.json({ imageUrl });
    } catch (err: any) {
      console.error("🔥 Error during upload controller:", err);
      res.status(500).json({ error: err.message || "Failed to process uploaded file" });
    }
  });

  // Get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, address, moo')
        .order('name', { ascending: true });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Add new customer
  app.post("/api/customers", async (req, res) => {
    const { name, phone, address, moo } = req.body;
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ name, phone, address: address || '', moo: moo || '' }])
        .select();

      if (error) {
        console.error("❌ Supabase Customer Insert Error:", error.message);
        return res.status(403).json({ error: error.message });
      }
      
      const newCustomer = data && data[0];
      res.json({ success: true, id: newCustomer?.id });
    } catch (error: any) {
      console.error("🔥 Internal Server Error (Add Customer):", error);
      res.status(500).json({ error: error.message || "Failed to add customer" });
    }
  });

  // Update customer
  app.put("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone, address, moo } = req.body;
    try {
      const { error } = await supabase
        .from('customers')
        .update({ name, phone, address: address || '', moo: moo || '' })
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update customer:", error);
      res.status(500).json({ error: error.message || "Failed to update customer" });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete customer:", error);
      res.status(500).json({ error: error.message || "Failed to delete customer" });
    }
  });

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Add new product
  app.post("/api/products", async (req, res) => {
    const { name, price, stock, category, image, barcode } = req.body;
    try {
      console.log("📝 Attempting to insert product:", { name, price, stock, category });
      
      const { data, error } = await supabase
        .from('products')
        .insert([{ 
          name, 
          price: Number(price), 
          stock: Number(stock), 
          category, 
          image, barcode: barcode || null
        }])
        .select();

      if (error) {
        console.error("❌ Supabase Insert Error:", error.message);
        return res.status(403).json({ 
          error: "Database Policy Error", 
          details: error.message,
          hint: "กรุณาตรวจสอบว่าได้ทำการ Disable RLS หรือตั้งค่า Policy ใน Supabase Dashboard แล้ว"
        });
      }
      
      const newProduct = data && data[0];
      console.log("✅ Product inserted successfully:", newProduct?.id);
      res.json({ success: true, id: newProduct?.id });
    } catch (error: any) {
      console.error("🔥 Internal Server Error (Add Product):", error);
      res.status(500).json({ error: error.message || "Failed to add product" });
    }
  });

  // Update product
  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, stock, category, image, barcode } = req.body;
    try {
      const { error } = await supabase
        .from('products')
        .update({ name, price, stock, category, image, barcode: barcode || null })
        .eq('id', id);

      if (error) {
        if (error.message.includes("column \"barcode\"")) {
          return res.status(403).json({
            error: "ยังไม่ได้สร้างคอลัมน์ barcode ในบอร์ด Supabase",
            details: "กรุณารันคำสั่ง SQL: ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;"
          });
        }
        throw error;
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Cancel order and return stock
  app.patch("/api/orders/:id/cancel", async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    try {
      // 1. Get the order details first to know what to return
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !order) throw new Error("Order not found");
      if (order.status === 'Cancelled') return res.status(400).json({ error: "Order is already cancelled" });

      // 2. Fetch order items from supabase order_items table
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // 3. Update order status to Cancelled
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', id);

      if (updateError) throw updateError;

      // 4. Return stock for each item
      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          const productId = item.product_id;
          const qty = item.quantity;

          if (productId) {
            // Increment stock
            const { data: p, error: pError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', productId)
              .single();

            if (!pError && p) {
              await supabase.from('products').update({ stock: p.stock + qty }).eq('id', productId);
              
              // Log stock return
              try {
                await supabase.from('stock_history').insert([{
                  product_id: productId,
                  change: qty,
                  reason: `ยกเลิกบิล #${id}`,
                  operator: user || 'System'
                }]);
              } catch (logErr) {
                console.warn("Log error:", logErr);
              }
            }
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Cancel order failed:", error);
      res.status(500).json({ error: error.message || "Failed to cancel order" });
    }
  });

  // Detailed stock update route
  app.patch("/api/products/:id/stock", async (req, res) => {
    const { id } = req.params;
    const { amount, reason, user } = req.body;
    try {
      console.log(`📦 Stock Update [PID: ${id}]: ${amount > 0 ? '+' : ''}${amount} by ${user || 'System'}. Reason: ${reason || 'N/A'}`);
      
      // First get current stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const newStock = (product.stock || 0) + amount;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Optional: Insert into a dedicated logs table if it exists
      // We'll try to insert and just catch error if table doesn't exist
      try {
        await supabase.from('stock_history').insert([{
          product_id: parseInt(id),
          change: amount,
          reason: reason || 'ปรับยอดทั่วไป',
          operator: user || 'Admin'
        }]);
      } catch (logErr) {
        console.warn("⚠️ Could not log to stock_history table (it might not exist):", logErr);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Stock update failed:", error);
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  // Order sellers helper functions
  const SELLERS_FILE = path.join(UPLOADS_DIR, "order_sellers.json");

  function getOrderSellers() {
    try {
      if (fs.existsSync(SELLERS_FILE)) {
        return JSON.parse(fs.readFileSync(SELLERS_FILE, "utf-8"));
      }
    } catch (e) {
      console.warn("⚠️ Failed to read order_sellers.json:", e);
    }
    return {};
  }

  function saveOrderSeller(orderId: string, sellerName: string) {
    try {
      const sellers = getOrderSellers();
      sellers[orderId.toString()] = sellerName;
      fs.writeFileSync(SELLERS_FILE, JSON.stringify(sellers, null, 2), "utf-8");
    } catch (e) {
      console.warn("⚠️ Failed to write to order_sellers.json:", e);
    }
  }

  // Example: Record a sale
  app.post("/api/orders", async (req, res) => {
    const { customerId, total, items, status, sellerName } = req.body;
    try {
      // 1. Create the order
      let orderData = null;
      let orderError = null;

      try {
        // Try inserting with seller_name field first
        const result = await supabase
          .from('orders')
          .insert([{ 
            customer_id: customerId, 
            total, 
            status: status || 'Paid', 
            seller_name: sellerName 
          }])
          .select();
        orderData = result.data;
        orderError = result.error;
      } catch (err: any) {
        orderError = err;
      }

      if (orderError) {
        console.warn("⚠️ Column 'seller_name' may not exist in 'orders' table yet. Falling back to standard insert:", orderError.message || orderError);
        // Fallback: standard insert without seller_name
        const result = await supabase
          .from('orders')
          .insert([{ 
            customer_id: customerId, 
            total, 
            status: status || 'Paid' 
          }])
          .select();
        orderData = result.data;
        orderError = result.error;
      }

      if (orderError) {
        console.error("❌ Supabase Order Error:", orderError.message);
        throw orderError;
      }

      const orderRow = orderData && orderData[0];
      const orderId = orderRow.id;

      // Save seller mapping if provided
      if (orderId && sellerName) {
        saveOrderSeller(orderId.toString(), sellerName);
      }

      // 2. Create order items and update stock
      for (const item of items) {
        // Insert order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert([{ 
            order_id: orderId, 
            product_id: item.product.id, 
            quantity: item.quantity, 
            price: item.product.price 
          }]);
        
        if (itemError) throw itemError;

        // Update product stock
        const { data: product, error: stockFetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .single();

        if (stockFetchError) throw stockFetchError;

        const { error: stockUpdateError } = await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product.id);

        if (stockUpdateError) throw stockUpdateError;
      }

      res.json({ success: true, orderId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Order process failed" });
    }
  });

  // Get all orders (Sales history)
  app.get("/api/orders", async (req, res) => {
    try {
      let orders = null;
      let ordersError = null;

      try {
        // Try getting orders with seller_name column
        const result = await supabase
          .from('orders')
          .select(`
            id,
            total,
            status,
            created_at,
            seller_name,
            customer:customer_id (name, phone)
          `)
          .order('id', { ascending: false });
        orders = result.data;
        ordersError = result.error;
      } catch (err: any) {
        ordersError = err;
      }

      if (ordersError) {
        console.warn("⚠️ Column 'seller_name' may not exist in 'orders' table yet. Falling back to standard select:", ordersError.message || ordersError);
        // Fallback: select without seller_name
        const result = await supabase
          .from('orders')
          .select(`
            id,
            total,
            status,
            created_at,
            customer:customer_id (name, phone)
          `)
          .order('id', { ascending: false });
        orders = result.data;
        ordersError = result.error;
      }

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return res.json([]);
      }

      // Fetch all order items and products for these orders
      const { data: allItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          quantity,
          price,
          product:product_id (name)
        `);

      if (itemsError) throw itemsError;

      // Map everything together
      const sellersMap = getOrderSellers();
      const ordersWithItems = orders.map((order: any) => {
        const items = allItems
          .filter((item: any) => item.order_id === order.id)
          .map((item: any) => ({
            product: { name: item.product?.name || 'Unknown Product', price: item.price },
            quantity: item.quantity
          }));

        return {
          id: order.id.toString(),
          total: order.total,
          status: order.status,
          date: order.created_at,
          customer_name: order.customer?.name || 'ลูกค้าทั่วไป',
          customer_phone: order.customer?.phone || '-',
          seller_name: order.seller_name || sellersMap[order.id.toString()] || 'เจ้าของร้าน',
          items: items.map(it => ({
            name: it.product?.name || 'สินค้าลบไปแล้ว',
            price: it.product?.price || 0,
            quantity: it.quantity
          }))
        };
      });

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Fetch orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true, message: "Order status updated" });
    } catch (error) {
      console.error("Failed to update order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // --- User Database Management Endpoints ---
  const USERS_FILE = path.join(UPLOADS_DIR, "system_users.json");

  // Helper to read local users
  const readLocalUsers = (): any[] => {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("⚠️ Failed to read local users file:", err);
    }
    const defaultUsers = [{ id: 1, name: "เจ้าของร้าน", role: "เจ้าของร้าน", pin: "1234", phone: "-" }];
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
    } catch (writeErr) {
      console.error("⚠️ Failed to write default users file:", writeErr);
    }
    return defaultUsers;
  };

  // Helper to write local users
  const writeLocalUsers = (users: any[]) => {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch (err) {
      console.error("⚠️ Failed to write local users file:", err);
    }
  };

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      // 1. Try fetching from Supabase table system_users
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        // Table probably doesn't exist, use local fallback
        console.warn("⚠️ Supabase system_users table not found, using local fallback:", error.message);
        const localData = readLocalUsers();
        return res.json({ source: "local", data: localData });
      }

      // If empty in database, initialize first owner in database if we can
      if (!data || data.length === 0) {
        const defaultUser = { name: "เจ้าของร้าน", role: "เจ้าของร้าน", pin: "1234", phone: "-" };
        try {
          const { data: inserted, error: insertError } = await supabase
            .from('system_users')
            .insert([defaultUser])
            .select();
          
          if (!insertError && inserted) {
            return res.json({ source: "supabase", data: inserted });
          }
        } catch (dbInitErr) {
          console.warn("⚠️ Failed to initialize default user in DB:", dbInitErr);
        }
      }

      res.json({ source: "supabase", data: data || [] });
    } catch (err: any) {
      console.error("🔥 Error listing users:", err);
      // Gracious fallback
      const localData = readLocalUsers();
      res.json({ source: "local", data: localData });
    }
  });

  // Add new user
  app.post("/api/users", async (req, res) => {
    const { name, role, pin, phone } = req.body;
    if (!name || !role || !pin) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, บทบาท, รหัส PIN)" });
    }
    try {
      // 1. Check if PIN is already used
      let pinConflict = false;

      // Try checking in Supabase
      const { data: dbUsers, error: fetchError } = await supabase
        .from('system_users')
        .select('pin')
        .eq('pin', pin.trim());

      if (!fetchError && dbUsers && dbUsers.length > 0) {
        pinConflict = true;
      } else {
        // If supabase fails or table doesn't exist, check local
        const localUsers = readLocalUsers();
        pinConflict = localUsers.some(u => u.pin === pin.trim());
      }

      if (pinConflict) {
        return res.status(400).json({ error: "รหัส PIN นี้ถูกใช้งานแล้ว กรุณาเลือกรหัสอื่น" });
      }

      // Try inserting to Supabase
      const { data, error } = await supabase
        .from('system_users')
        .insert([{ name, role, pin: pin.trim(), phone: phone || '' }])
        .select();

      if (error) {
        console.warn("⚠️ Supabase User Insert failed, writing locally instead:", error.message);
        const localUsers = readLocalUsers();
        const nextId = localUsers.length > 0 ? Math.max(...localUsers.map(u => u.id || 0)) + 1 : 1;
        const newUser = { id: nextId, name, role, pin: pin.trim(), phone: phone || '-' };
        localUsers.push(newUser);
        writeLocalUsers(localUsers);
        return res.json({ success: true, source: "local", data: newUser });
      }

      res.json({ success: true, source: "supabase", data: data && data[0] });
    } catch (err: any) {
      console.error("🔥 Error adding user:", err);
      // Fallback
      const localUsers = readLocalUsers();
      const nextId = localUsers.length > 0 ? Math.max(...localUsers.map(u => u.id || 0)) + 1 : 1;
      const newUser = { id: nextId, name, role, pin: pin.trim(), phone: phone || '-' };
      localUsers.push(newUser);
      writeLocalUsers(localUsers);
      res.json({ success: true, source: "local", data: newUser });
    }
  });

  // Update user
  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, role, pin, phone } = req.body;
    try {
      let pinConflict = false;
      const parsedId = parseInt(id);

      const { data: dbUsers, error: fetchError } = await supabase
        .from('system_users')
        .select('id, pin');

      if (!fetchError && dbUsers) {
        pinConflict = dbUsers.some((u: any) => u.pin === pin.trim() && u.id !== parsedId);
      } else {
        const localUsers = readLocalUsers();
        pinConflict = localUsers.some(u => u.pin === pin.trim() && u.id !== parsedId);
      }

      if (pinConflict) {
        return res.status(400).json({ error: "รหัส PIN นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว" });
      }

      // Try updating in Supabase
      const { error } = await supabase
        .from('system_users')
        .update({ name, role, pin: pin.trim(), phone: phone || '' })
        .eq('id', id);

      if (error) {
        console.warn("⚠️ Supabase User Update failed, updating locally instead:", error.message);
        const localUsers = readLocalUsers();
        const idx = localUsers.findIndex(u => u.id === parsedId);
        if (idx !== -1) {
          localUsers[idx] = { ...localUsers[idx], name, role, pin: pin.trim(), phone: phone || '-' };
          writeLocalUsers(localUsers);
          return res.json({ success: true, source: "local" });
        }
        return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" });
      }

      res.json({ success: true, source: "supabase" });
    } catch (err: any) {
      console.error("🔥 Error updating user:", err);
      // Fallback
      const localUsers = readLocalUsers();
      const idx = localUsers.findIndex(u => u.id === parseInt(id));
      if (idx !== -1) {
        localUsers[idx] = { ...localUsers[idx], name, role, pin: pin.trim(), phone: phone || '-' };
        writeLocalUsers(localUsers);
        return res.json({ success: true, source: "local" });
      }
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const parsedId = parseInt(id);
      let totalUsers = 0;

      const { data: dbUsers, error: fetchError } = await supabase
        .from('system_users')
        .select('*');

      if (!fetchError && dbUsers) {
        totalUsers = dbUsers.length;
      } else {
        const localUsers = readLocalUsers();
        totalUsers = localUsers.length;
      }

      if (totalUsers <= 1) {
        return res.status(400).json({ error: "ไม่สามารถลบผู้ใช้งานคนสุดท้ายของระบบได้" });
      }

      // Try deleting in Supabase
      const { error } = await supabase
        .from('system_users')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn("⚠️ Supabase User Delete failed, deleting locally instead:", error.message);
        const localUsers = readLocalUsers();
        const updated = localUsers.filter(u => u.id !== parsedId);
        writeLocalUsers(updated);
        return res.json({ success: true, source: "local" });
      }

      res.json({ success: true, source: "supabase" });
    } catch (err: any) {
      console.error("🔥 Error deleting user:", err);
      const localUsers = readLocalUsers();
      const updated = localUsers.filter(u => u.id !== parseInt(id));
      writeLocalUsers(updated);
      res.json({ success: true, source: "local" });
    }
  });

  // User login verification config
  app.post("/api/users/login", async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "กรุณากรอกรหัส PIN" });
    }
    try {
      // Search in Supabase first
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('pin', pin.trim());

      if (!error && data && data.length > 0) {
        const matchedUser = data[0];
        return res.json({ success: true, user: matchedUser, source: "supabase" });
      }

      // Fallback / local search if supabase has error or no match
      const localUsers = readLocalUsers();
      const matchedLocal = localUsers.find(u => u.pin === pin.trim());
      if (matchedLocal) {
        return res.json({ success: true, user: matchedLocal, source: "local" });
      }

      // If no match found anywhere
      res.status(401).json({ success: false, error: "รหัส PIN ไม่ถูกต้อง" });
    } catch (err: any) {
      console.error("🔥 Login check failed, falling back to local list:", err);
      const localUsers = readLocalUsers();
      const matchedLocal = localUsers.find(u => u.pin === pin.trim());
      if (matchedLocal) {
        return res.json({ success: true, user: matchedLocal, source: "local" });
      }
      res.status(401).json({ success: false, error: "รหัส PIN ไม่ถูกต้อง" });
    }
  });

  // --- Categories Database Management Endpoints ---
  const CATEGORIES_FILE = path.join(UPLOADS_DIR, "categories.json");

  // Helper to read local categories
  const readLocalCategories = (): any[] => {
    try {
      if (fs.existsSync(CATEGORIES_FILE)) {
        const raw = fs.readFileSync(CATEGORIES_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("⚠️ Failed to read local categories file:", err);
    }
    const defaultCategories = [
      { id: 1, name: "เสื้อเชิ้ต" },
      { id: 2, name: "กางเกง" },
      { id: 3, name: "อื่นๆ" }
    ];
    try {
      fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2), "utf-8");
    } catch (writeErr) {
      console.error("⚠️ Failed to write default categories file:", writeErr);
    }
    return defaultCategories;
  };

  // Helper to write local categories
  const writeLocalCategories = (categories: any[]) => {
    try {
      fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), "utf-8");
    } catch (err) {
      console.error("⚠️ Failed to write local categories file:", err);
    }
  };

  // 1. Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn("⚠️ Supabase categories table not found, using local fallback:", error.message);
        const localData = readLocalCategories();
        return res.json({ source: "local", data: localData });
      }

      return res.json({ source: "supabase", data });
    } catch (err: any) {
      console.warn("🔥 Fetch categories failed, using local fallback:", err);
      const localData = readLocalCategories();
      res.json({ source: "local", data: localData });
    }
  });

  // 2. Add category
  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "กรุณาระบุชื่อประเภทสินค้า" });
    }
    const cleanedName = name.trim();

    try {
      let isDuplicate = false;
      const { data: dbCategories, error: fetchErr } = await supabase
        .from('categories')
        .select('name');
      
      if (!fetchErr && dbCategories) {
        isDuplicate = dbCategories.some((c: any) => c.name.toLowerCase() === cleanedName.toLowerCase());
      } else {
        const localList = readLocalCategories();
        isDuplicate = localList.some(c => c.name.toLowerCase() === cleanedName.toLowerCase());
      }

      if (isDuplicate) {
        return res.status(400).json({ error: `ประเภทสินค้า "${cleanedName}" มีอยู่แล้ว` });
      }

      // Try inserting to Supabase
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: cleanedName }])
        .select();

      if (error) {
        console.warn("⚠️ Supabase insertion of category failed, saving locally:", error.message);
        const localList = readLocalCategories();
        const nextId = localList.length > 0 ? Math.max(...localList.map(c => c.id || 0)) + 1 : 1;
        const newCategory = { id: nextId, name: cleanedName };
        localList.push(newCategory);
        writeLocalCategories(localList);
        return res.json({ success: true, source: "local", data: newCategory });
      }

      return res.json({ success: true, source: "supabase", data: data[0] });
    } catch (err: any) {
      console.warn("🔥 Create category failed, saving locally:", err);
      const localList = readLocalCategories();
      const nextId = localList.length > 0 ? Math.max(...localList.map(c => c.id || 0)) + 1 : 1;
      const newCategory = { id: nextId, name: cleanedName };
      localList.push(newCategory);
      writeLocalCategories(localList);
      res.json({ success: true, source: "local", data: newCategory });
    }
  });

  // 3. Update category
  app.put("/api/categories/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "กรุณาระบุชื่อประเภทสินค้า" });
    }
    const cleanedName = name.trim();
    const parsedId = parseInt(id);

    try {
      let isDuplicate = false;
      const { data: dbCategories, error: fetchErr } = await supabase
        .from('categories')
        .select('id, name');

      if (!fetchErr && dbCategories) {
        isDuplicate = dbCategories.some((c: any) => c.name.toLowerCase() === cleanedName.toLowerCase() && Number(c.id) !== parsedId);
      } else {
        const localList = readLocalCategories();
        isDuplicate = localList.some(c => c.name.toLowerCase() === cleanedName.toLowerCase() && c.id !== parsedId);
      }

      if (isDuplicate) {
        return res.status(400).json({ error: `ประเภทสินค้า "${cleanedName}" มีอยู่แล้ว` });
      }

      // Try updating in Supabase
      const { error } = await supabase
        .from('categories')
        .update({ name: cleanedName })
        .eq('id', id);

      if (error) {
        console.warn("⚠️ Supabase update of category failed, updating locally:", error.message);
        const localList = readLocalCategories();
        const idx = localList.findIndex(c => c.id === parsedId);
        if (idx !== -1) {
          localList[idx].name = cleanedName;
          writeLocalCategories(localList);
        }
        return res.json({ success: true, source: "local" });
      }

      return res.json({ success: true, source: "supabase" });
    } catch (err: any) {
      console.warn("🔥 Update category failed, updating locally:", err);
      const localList = readLocalCategories();
      const idx = localList.findIndex(c => c.id === parsedId);
      if (idx !== -1) {
        localList[idx].name = cleanedName;
        writeLocalCategories(localList);
      }
      res.json({ success: true, source: "local" });
    }
  });

  // 4. Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    const { id } = req.params;
    const parsedId = parseInt(id);

    try {
      // Try deleting in Supabase
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn("⚠️ Supabase delete of category failed, deleting locally:", error.message);
        const localList = readLocalCategories();
        const updated = localList.filter(c => c.id !== parsedId);
        writeLocalCategories(updated);
        return res.json({ success: true, source: "local" });
      }

      return res.json({ success: true, source: "supabase" });
    } catch (err: any) {
      console.warn("🔥 Delete category failed, deleting locally:", err);
      const localList = readLocalCategories();
      const updated = localList.filter(c => c.id !== parsedId);
      writeLocalCategories(updated);
      res.json({ success: true, source: "local" });
    }
  });

// --- Global Express Error Handler ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 Unhandled Express Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "Something went wrong on the server",
    details: err.stack || err
  });
});

async function startServer() {
  // Server-side connection test
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      if (error) {
        console.warn("⚠️ Supabase connection test failed:", error.message);
      } else {
        console.log("✅ Supabase connected successfully!");
      }
    } catch (e) {
      console.error("❌ Supabase connection error:", e);
    }
  }

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
