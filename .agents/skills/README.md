# Agent Skills System

Hệ thống SKILLS 3 tầng cho AI Agent (Claude Code / Cursor / Cline).

---

## Architecture Overview

```
.agents/skills/
├── README.md                        ← Bạn đang đọc file này
├── REGISTRY.md                      ← Index tất cả skills (agent đọc đây trước)
└── ecommerce-core/
    └── SKILL.md                     ← Tầng 1: Global rules & conventions

src/modules/
├── orders/skills/SKILL.md           ← Tầng 2: Order domain rules
├── products/skills/SKILL.md         ← Tầng 2: Product domain rules
├── payments/skills/SKILL.md         ← Tầng 2: Payment domain rules
├── users/skills/SKILL.md            ← Tầng 2: User domain rules
└── carts/skills/SKILL.md            ← Tầng 2: Cart domain rules
```

---

## How Agent Loads Skills

### Step 1 — Luôn đọc REGISTRY.md trước
```
File: .agents/skills/REGISTRY.md
Purpose: tìm skill phù hợp với task hiện tại
```

### Step 2 — Load ecommerce-core (bắt buộc)
```
File: .agents/skills/ecommerce-core/SKILL.md
Purpose: global conventions, coding rules, architecture invariants
```

### Step 3 — Load module skill (theo task)
```
Nếu task liên quan orders:
  → src/modules/orders/skills/SKILL.md

Nếu task liên quan products:
  → src/modules/products/skills/SKILL.md

Nếu task span nhiều modules:
  → Load tất cả modules liên quan
```

### Step 4 — Apply rules
```
1. Không vi phạm Anti-patterns
2. Tuân theo Common Workflows
3. Tuân theo Business Rules (R1, R2, ...)
```

---

## Tier Explanation

| Tier | Scope | Update Frequency |
|------|-------|-----------------|
| Tầng 1 (ecommerce-core) | Toàn hệ thống | Hiếm — chỉ khi có architectural decision |
| Tầng 2 (module skills) | 1 domain | Mỗi khi business rule thay đổi |
| Registry | Mapping | Mỗi khi thêm/đổi tên module |

---

## Adding a New Module

```bash
# 1. Tạo thư mục skill
mkdir src/modules/<name>/skills

# 2. Copy template
cp .agents/skills/ecommerce-core/SKILL.md src/modules/<name>/skills/SKILL.md

# 3. Sửa nội dung template theo domain mới

# 4. Register trong REGISTRY.md
#    - Thêm vào bảng Skill Index
#    - Thêm vào Module → Skill Mapping
#    - Cập nhật Dependency Graph
```

Template SKILL.md tối thiểu:
```markdown
# SKILL: <Module Name>

version: 1.0.0
scope: module
module: <name>
depends-on: [ecommerce-core]
triggers: ["keyword1", "keyword2"]

## When to Use
## Module Responsibilities
## Key Files
## Data Model
## Business Rules
## Common Workflows
## API Endpoints
## Anti-patterns
```

---

## Updating an Existing Skill

```
1. Sửa nội dung SKILL.md
2. Tăng version (patch → minor → major)
3. Ghi changelog ngắn vào đầu file nếu thay đổi major
```

---

## Debugging: When Skill Doesn't Trigger

Checklist:
```
□ Triggers trong SKILL.md có match keyword trong task không?
□ Agent đã đọc REGISTRY.md chưa?
□ File path trong REGISTRY.md có đúng không? (kiểm tra relative path)
□ SKILL.md có syntax error không? (thiếu section, broken markdown)
□ Tầng 1 (ecommerce-core) có được load trước không?
```

---

## Skill Evaluation (Testing)

Để test một skill có hoạt động đúng:

```
1. Tạo task mô phỏng: "Tạo endpoint cancel order"
2. Kiểm tra agent có load đúng skill không (orders skill)
3. Kiểm tra output có tuân thủ:
   - State machine transitions
   - Transaction pattern
   - Đúng HTTP exceptions
   - Không vi phạm anti-patterns
4. Review output với checklist trong SKILL.md
```

Eval prompt template:
```
Given this task: [task description]
Which skills should be loaded? [expected: ecommerce-core + X]
Does the output follow Rule R1, R2, R3?
Does the output avoid all anti-patterns?
```
