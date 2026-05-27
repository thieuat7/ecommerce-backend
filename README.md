# 🛒 Ecommerce Backend API

> **RESTful API** cho hệ thống thương mại điện tử, xây dựng bằng **NestJS** + **PostgreSQL** + **TypeORM** — hỗ trợ xác thực JWT, thanh toán MoMo, phân quyền RBAC, và tài liệu Swagger tự động.

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Kiến trúc dự án](#-kiến-trúc-dự-án)
- [API Endpoints](#-api-endpoints)
- [Cài đặt & Chạy thủ công](#-cài-đặt--chạy-thủ-công)
- [Chạy bằng Docker](#-chạy-bằng-docker)
- [Biến môi trường](#-biến-môi-trường)
- [Database Migration & Seed](#-database-migration--seed)
- [Swagger UI](#-swagger-ui)

---

## ✨ Tính năng

| Nhóm | Chi tiết |
|---|---|
| 🔐 **Authentication** | Đăng ký, đăng nhập, refresh token (JWT Rotation), đăng xuất |
| 👥 **Phân quyền** | RBAC theo role (`admin` / `user`), guard JWT tích hợp sẵn |
| 🛍️ **Sản phẩm** | CRUD, lọc & phân trang, quản lý ảnh, gắn danh mục |
| 🎨 **Variants** | Biến thể sản phẩm (size, màu, …), tự động sinh SKU, optimistic locking |
| 🏷️ **Attributes** | Quản lý thuộc tính & giá trị thuộc tính cho variant |
| 📁 **Danh mục** | CRUD danh mục sản phẩm |
| 📦 **Đơn hàng** | Tạo/xem/hủy đơn hàng, kiểm soát trạng thái |
| 💳 **Thanh toán** | Tích hợp **MoMo** (tạo link thanh toán + IPN Webhook) |
| 📊 **Stock Logs** | Lịch sử nhập/xuất kho tự động theo biến động tồn kho |
| 📄 **Swagger** | Tài liệu API tự động tại `/api` |

---

## 🛠️ Tech Stack

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| [NestJS](https://nestjs.com/) | v11 | Framework chính |
| [TypeScript](https://www.typescriptlang.org/) | v5 | Ngôn ngữ lập trình |
| [PostgreSQL](https://www.postgresql.org/) | v15 | Cơ sở dữ liệu quan hệ |
| [TypeORM](https://typeorm.io/) | v0.3 | ORM — ánh xạ entity |
| [Knex.js](https://knexjs.org/) | v3 | Migration & Seed |
| [Passport JWT](https://www.npmjs.com/package/passport-jwt) | v4 | Xác thực JWT |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | v6 | Mã hóa mật khẩu |
| [Swagger](https://swagger.io/) | v11 | Tài liệu API tự động |
| [class-validator](https://github.com/typestack/class-validator) | v0.14 | Validation DTO |
| [Docker](https://www.docker.com/) | — | Container hóa ứng dụng |

---

## 🏗️ Kiến trúc dự án

```
src/
├── common/                  # Dùng chung toàn project
│   ├── decorators/          # @UseAuth(), @GetCurrentUser()
│   └── guards/              # JwtAuthGuard, RtGuard
│
├── config/                  # Cấu hình (Swagger, TypeORM, …)
│
├── database/                # Module kết nối database
│
├── migrations/              # Knex migrations (schema DB)
│
├── seeds/                   # Knex seed data (dữ liệu mẫu)
│
└── modules/
    ├── auth/                # Đăng ký / Đăng nhập / JWT
    ├── users/               # Quản lý người dùng
    ├── roles/               # Quản lý role
    ├── categories/          # Danh mục sản phẩm
    ├── products/            # Sản phẩm (CRUD + ảnh + lọc)
    ├── variant/             # Biến thể sản phẩm
    ├── attribute/           # Thuộc tính & giá trị
    ├── orders/              # Đơn hàng
    ├── order-items/         # Chi tiết đơn hàng
    ├── payments/            # Thanh toán MoMo
    └── stock-logs/          # Lịch sử kho hàng
```

---

## 📡 API Endpoints

> 🔒 = Yêu cầu JWT Access Token  |  👑 = Chỉ dành cho Admin

### Auth — `/auth`

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/auth/login` | Đăng nhập, nhận `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | 🔒 Làm mới access token |
| `POST` | `/auth/logout` | 🔒 Đăng xuất |

### Categories — `/categories`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/categories` | Danh sách tất cả danh mục |
| `GET` | `/categories/:id` | Chi tiết một danh mục |
| `POST` | `/categories` | 👑 Tạo danh mục mới |
| `PATCH` | `/categories/:id` | 👑 Cập nhật danh mục |
| `DELETE` | `/categories/:id` | 👑 Xóa danh mục |

### Products — `/products`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/products` | Danh sách sản phẩm (lọc + phân trang) |
| `GET` | `/products/:id` | Chi tiết sản phẩm (kèm variants, images) |
| `POST` | `/products` | 👑 Tạo sản phẩm mới |
| `PUT` | `/products/:id` | 👑 Cập nhật sản phẩm (optimistic lock) |
| `DELETE` | `/products/:id` | 👑 Xóa mềm sản phẩm |
| `POST` | `/products/:id/categories` | 👑 Gắn danh mục vào sản phẩm |
| `DELETE` | `/products/:id/categories/:categoryId` | 👑 Gỡ danh mục khỏi sản phẩm |
| `POST` | `/products/:id/images` | 👑 Thêm ảnh sản phẩm |
| `DELETE` | `/products/images/:imageId` | 👑 Xóa ảnh sản phẩm |
| `PATCH` | `/products/images/:imageId/order` | 👑 Cập nhật thứ tự ảnh |

**Query params lọc sản phẩm:**
```
GET /products?categoryId=1&minPrice=100000&maxPrice=500000&keyword=áo&page=1&limit=10
```

### Variants — `/products/:productId/variants`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/products/:productId/variants` | Danh sách variants của sản phẩm |
| `GET` | `/variants/:id` | Chi tiết variant (kèm stock logs) |
| `POST` | `/products/:productId/variants` | 👑 Tạo variant mới |
| `PUT` | `/variants/:id` | 👑 Cập nhật variant (optimistic lock) |
| `DELETE` | `/variants/:id` | 👑 Xóa variant |
| `POST` | `/variants/:id/images` | 👑 Thêm ảnh variant |
| `DELETE` | `/variants/images/:imageId` | 👑 Xóa ảnh variant |

### Attributes — `/attributes`

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/attributes` | Danh sách attributes (`?includeValues=true`) |
| `GET` | `/attributes/:id` | Chi tiết attribute (kèm values) |
| `GET` | `/attributes/:id/values` | Danh sách values của attribute |
| `POST` | `/attributes` | 👑 Tạo attribute mới |
| `PUT` | `/attributes/:id` | 👑 Cập nhật attribute |
| `DELETE` | `/attributes/:id` | 👑 Xóa attribute |
| `POST` | `/attribute-values` | 👑 Tạo attribute value |
| `PUT` | `/attribute-values/:id` | 👑 Cập nhật attribute value |
| `DELETE` | `/attribute-values/:id` | 👑 Xóa attribute value |

### Orders — `/orders`

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/orders` | 🔒 Tạo đơn hàng mới |
| `GET` | `/orders` | 🔒 Danh sách đơn hàng của tôi |
| `GET` | `/orders/:id` | 🔒 Chi tiết một đơn hàng |
| `PATCH` | `/orders/:id` | 🔒 Cập nhật trạng thái đơn hàng |
| `DELETE` | `/orders/:id` | 🔒 Hủy đơn hàng (chỉ khi `PENDING`) |
| `DELETE` | `/orders/admin/:orderId` | 👑 Admin xóa đơn hàng |

### Payments — `/payments`

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/payments/momo/create` | 🔒 Tạo link thanh toán MoMo |
| `POST` | `/payments/momo/ipn` | Webhook nhận kết quả từ MoMo |

---

## 🚀 Cài đặt & Chạy thủ công

### Yêu cầu

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm** >= 9

### Các bước

```bash
# 1. Clone repository
git clone <repo-url>
cd ecommerce-backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file môi trường
cp .env.example .env
# Chỉnh sửa .env cho phù hợp môi trường của bạn

# 4. Chạy migration & seed database
npm run db:setup

# 5. Khởi động server (development)
npm run start:dev
```

Ứng dụng sẽ chạy tại: **http://localhost:3000**

---

## 🐳 Chạy bằng Docker

Cách nhanh nhất để khởi động toàn bộ hệ thống (PostgreSQL + Migration + Backend):

```bash
# 1. Tạo file môi trường
cp .env.example .env

# 2. Build và chạy tất cả services
docker compose up --build
```

> Docker Compose sẽ tự động:
> 1. Khởi động PostgreSQL và đợi healthy
> 2. Chạy migration + seed dữ liệu mẫu
> 3. Khởi động NestJS backend

| Service | Port | Mô tả |
|---|---|---|
| `backend` | `3000` | NestJS API server |
| `postgres-db` | `5432` | PostgreSQL database |

```bash
# Dừng và xóa containers
docker compose down

# Dừng và xóa cả volume (reset toàn bộ data)
docker compose down -v
```

---

## ⚙️ Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ecommerce

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRE_IN=7d

# Logging
LOG_LEVEL=info

# CORS (URL của frontend)
CORS_ORIGIN=http://localhost:5054

# MoMo Payment
MOMO_PARTNER_CODE=MOMOXXXXXX
MOMO_ACCESS_KEY=XXXXXXXXXXX
MOMO_SECRET_KEY=XXXXXXXXXXXXX
```

> ⚠️ **Không commit file `.env` lên repository!** File này đã được thêm vào `.gitignore`.

---

## 🗄️ Database Migration & Seed

Dự án sử dụng **Knex.js** để quản lý migration và seed data.

```bash
# Chạy migration (tạo/cập nhật schema)
npm run migrate:run

# Chạy seed (thêm dữ liệu mẫu)
npm run seed:run

# Cả hai cùng lúc
npm run db:setup
```

**Dữ liệu seed mặc định bao gồm:**
- Roles: `admin`, `user`
- Tài khoản admin mặc định
- Danh mục, sản phẩm, và variants mẫu

---

## 📄 Swagger UI

Sau khi server chạy, truy cập tài liệu API tại:

```
http://localhost:3000/api
```

Swagger tự động document toàn bộ endpoints với mô tả, request/response schema, và hỗ trợ thử nghiệm trực tiếp ngay trên giao diện.

---

## 📝 Scripts

| Script | Mô tả |
|---|---|
| `npm run start:dev` | Chạy development server (hot-reload) |
| `npm run start:prod` | Chạy production server |
| `npm run build` | Build TypeScript sang JavaScript |
| `npm run lint` | Kiểm tra và sửa lỗi ESLint |
| `npm run format` | Format code với Prettier |
| `npm run test` | Chạy unit tests |
| `npm run test:cov` | Chạy tests với coverage report |
| `npm run db:setup` | Chạy migration + seed |

---

## 📌 Lưu ý phát triển

- **Optimistic Locking**: Khi cập nhật `Product` hoặc `Variant`, cần gửi kèm `version` hiện tại để tránh xung đột concurrent update.
- **Soft Delete**: Sản phẩm bị xóa sẽ không bị mất khỏi database mà chỉ được đánh dấu `deletedAt`.
- **Stock Logs**: Mỗi khi tồn kho của variant thay đổi, hệ thống tự động ghi log vào bảng `stock_logs`.
- **JWT Rotation**: Refresh token được hash trước khi lưu vào DB và bị vô hiệu hóa sau khi sử dụng.
