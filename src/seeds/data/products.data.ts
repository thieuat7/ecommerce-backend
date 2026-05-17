/**
 * products.data.ts
 *
 * Dữ liệu sản phẩm mẫu cho seeding.
 * File này chỉ chứa data (array of plain objects).
 * Logic insert được xử lý trong 04_products.ts.
 */

export type ProductSeedItem = {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  is_active: boolean;
  categoryNames: string[]; // Tên category để lookup id
  variants: VariantSeedItem[];
};

export type VariantSeedItem = {
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  /**
   * Mảng options: mỗi phần tử là 1 attribute_value
   * Dùng để tạo product_variant_options
   */
  options: {
    attributeName: string; // 'color', 'storage', 'config'
    attributeDisplayName: string; // 'Màu sắc', 'Bộ nhớ', 'Cấu hình'
    value: string; // 'black', '64gb'
    displayValue: string; // 'Đen', '64 GB'
  }[];
  imageUrl: string;
  imageAlt: string;
};

export const PRODUCTS_DATA: ProductSeedItem[] = [
  // ─── Điện thoại ───────────────────────────────────────────────────────────
  {
    public_id: 'prod_iphone15',
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    description:
      'Điện thoại cao cấp của Apple, chip A17 Pro, màn hình Super Retina XDR 6.7 inch, camera 48MP.',
    price: 29990000,
    is_active: true,
    categoryNames: ['Điện thoại di động'],
    variants: [
      {
        sku: 'IP15PM-TITAN-256',
        price: 29990000,
        stock_quantity: 50,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'titan-natural',
            displayValue: 'Titan Tự Nhiên',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '256gb',
            displayValue: '256 GB',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/iphone15promax-titan.jpg',
        imageAlt: 'iPhone 15 Pro Max Titan Tự Nhiên 256GB',
      },
      {
        sku: 'IP15PM-BLUE-512',
        price: 34490000,
        stock_quantity: 30,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'titan-blue',
            displayValue: 'Titan Xanh',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '512gb',
            displayValue: '512 GB',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/iphone15promax-blue.jpg',
        imageAlt: 'iPhone 15 Pro Max Titan Xanh 512GB',
      },
    ],
  },
  {
    public_id: 'prod_iphone14',
    name: 'iPhone 14 Pro',
    slug: 'iphone-14-pro',
    description:
      'iPhone 14 Pro với Dynamic Island, chip A16 Bionic, màn hình Always-On 6.1 inch.',
    price: 23990000,
    is_active: true,
    categoryNames: ['Điện thoại di động'],
    variants: [
      {
        sku: 'IP14P-PURPLE-128',
        price: 23990000,
        stock_quantity: 40,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'deep-purple',
            displayValue: 'Tím Đậm',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '128gb',
            displayValue: '128 GB',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/iphone14pro-purple.jpg',
        imageAlt: 'iPhone 14 Pro Tím Đậm 128GB',
      },
      {
        sku: 'IP14P-GOLD-256',
        price: 26490000,
        stock_quantity: 35,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'gold',
            displayValue: 'Vàng Gold',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '256gb',
            displayValue: '256 GB',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/iphone14pro-gold.jpg',
        imageAlt: 'iPhone 14 Pro Vàng Gold 256GB',
      },
    ],
  },
  {
    public_id: 'prod_samsung_s24',
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    description:
      'Flagship Android với Galaxy AI, camera 200MP và bút S Pen tích hợp.',
    price: 28990000,
    is_active: true,
    categoryNames: ['Điện thoại di động'],
    variants: [
      {
        sku: 'S24U-BLACK-256',
        price: 28990000,
        stock_quantity: 60,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'titanium-black',
            displayValue: 'Titanium Đen',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '256gb',
            displayValue: '256 GB',
          },
        ],
        imageUrl: 'https://image-us.samsung.com/s24ultra-black.jpg',
        imageAlt: 'Samsung Galaxy S24 Ultra Titanium Đen 256GB',
      },
      {
        sku: 'S24U-GRAY-512',
        price: 32990000,
        stock_quantity: 25,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'titanium-gray',
            displayValue: 'Titanium Xám',
          },
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '512gb',
            displayValue: '512 GB',
          },
        ],
        imageUrl: 'https://image-us.samsung.com/s24ultra-gray.jpg',
        imageAlt: 'Samsung Galaxy S24 Ultra Titanium Xám 512GB',
      },
    ],
  },

  // ─── Laptop ───────────────────────────────────────────────────────────────
  {
    public_id: 'prod_macbook_m3',
    name: 'MacBook Pro M3',
    slug: 'macbook-pro-m3',
    description:
      'Laptop hiệu năng cao chip Apple M3, màn hình Liquid Retina XDR 14 inch, thời lượng pin lên đến 18 giờ.',
    price: 44990000,
    is_active: true,
    categoryNames: ['Máy tính xách tay'],
    variants: [
      {
        sku: 'MBM3-16-512-SG',
        price: 44990000,
        stock_quantity: 15,
        is_active: true,
        options: [
          {
            attributeName: 'config',
            attributeDisplayName: 'Cấu hình',
            value: '16gb-512gb',
            displayValue: '16GB RAM / 512GB SSD',
          },
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'space-gray',
            displayValue: 'Space Gray',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/macbookpro-m3-sg.jpg',
        imageAlt: 'MacBook Pro M3 Space Gray 16GB/512GB',
      },
      {
        sku: 'MBM3-32-1TB-SL',
        price: 59990000,
        stock_quantity: 8,
        is_active: true,
        options: [
          {
            attributeName: 'config',
            attributeDisplayName: 'Cấu hình',
            value: '32gb-1tb',
            displayValue: '32GB RAM / 1TB SSD',
          },
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'silver',
            displayValue: 'Silver',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/macbookpro-m3-sl.jpg',
        imageAlt: 'MacBook Pro M3 Silver 32GB/1TB',
      },
    ],
  },
  {
    public_id: 'prod_dell_xps',
    name: 'Dell XPS 15',
    slug: 'dell-xps-15',
    description:
      'Laptop cao cấp với màn hình OLED 3.5K, Intel Core i7 thế hệ 13, đồ họa NVIDIA RTX 4060.',
    price: 39990000,
    is_active: true,
    categoryNames: ['Máy tính xách tay'],
    variants: [
      {
        sku: 'XPS15-I7-16-512',
        price: 39990000,
        stock_quantity: 12,
        is_active: true,
        options: [
          {
            attributeName: 'config',
            attributeDisplayName: 'Cấu hình',
            value: 'i7-16gb-512gb',
            displayValue: 'Core i7 / 16GB / 512GB',
          },
        ],
        imageUrl: 'https://i.dell.com/dell-xps-15-512.jpg',
        imageAlt: 'Dell XPS 15 Core i7 16GB/512GB',
      },
      {
        sku: 'XPS15-I9-32-1TB',
        price: 52990000,
        stock_quantity: 5,
        is_active: true,
        options: [
          {
            attributeName: 'config',
            attributeDisplayName: 'Cấu hình',
            value: 'i9-32gb-1tb',
            displayValue: 'Core i9 / 32GB / 1TB',
          },
        ],
        imageUrl: 'https://i.dell.com/dell-xps-15-1tb.jpg',
        imageAlt: 'Dell XPS 15 Core i9 32GB/1TB',
      },
    ],
  },

  // ─── Tablet ───────────────────────────────────────────────────────────────
  {
    public_id: 'prod_ipad_air',
    name: 'iPad Air M1',
    slug: 'ipad-air-m1',
    description:
      'Máy tính bảng mỏng nhẹ với chip M1, màn hình Liquid Retina 10.9 inch, hỗ trợ Apple Pencil thế hệ 2.',
    price: 15990000,
    is_active: true,
    categoryNames: ['Tablet'],
    variants: [
      {
        sku: 'IPAD-AIR-64-WIFI-BL',
        price: 15990000,
        stock_quantity: 40,
        is_active: true,
        options: [
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '64gb',
            displayValue: '64 GB',
          },
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'blue',
            displayValue: 'Xanh Biển',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/ipad-air-m1-blue.jpg',
        imageAlt: 'iPad Air M1 64GB Xanh Biển',
      },
      {
        sku: 'IPAD-AIR-256-WIFI-SG',
        price: 19990000,
        stock_quantity: 20,
        is_active: true,
        options: [
          {
            attributeName: 'storage',
            attributeDisplayName: 'Bộ nhớ',
            value: '256gb',
            displayValue: '256 GB',
          },
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'space-gray',
            displayValue: 'Space Gray',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/ipad-air-m1-sg.jpg',
        imageAlt: 'iPad Air M1 256GB Space Gray',
      },
    ],
  },

  // ─── Tai nghe ─────────────────────────────────────────────────────────────
  {
    public_id: 'prod_airpods_pro',
    name: 'AirPods Pro 2',
    slug: 'airpods-pro-2',
    description:
      'Tai nghe không dây chống ồn chủ động H2, chế độ Transparency, âm thanh không gian.',
    price: 5990000,
    is_active: true,
    categoryNames: ['Tai nghe', 'Phụ kiện'],
    variants: [
      {
        sku: 'AIRPODS-PRO2-WHITE',
        price: 5990000,
        stock_quantity: 120,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'white',
            displayValue: 'Trắng',
          },
        ],
        imageUrl: 'https://store.storeimages.cdn-apple.com/airpods-pro2.jpg',
        imageAlt: 'AirPods Pro 2 Màu Trắng',
      },
    ],
  },
  {
    public_id: 'prod_samsung_buds',
    name: 'Samsung Galaxy Buds2 Pro',
    slug: 'samsung-buds2-pro',
    description:
      'Tai nghe true wireless, âm thanh Hi-Fi 24-bit, ANC thế hệ mới, pin lên đến 29 giờ.',
    price: 4190000,
    is_active: true,
    categoryNames: ['Tai nghe', 'Phụ kiện'],
    variants: [
      {
        sku: 'BUDS2PRO-GRAPHITE',
        price: 4190000,
        stock_quantity: 90,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'graphite',
            displayValue: 'Graphite',
          },
        ],
        imageUrl: 'https://image-us.samsung.com/buds2pro-graphite.jpg',
        imageAlt: 'Samsung Galaxy Buds2 Pro Graphite',
      },
      {
        sku: 'BUDS2PRO-BORA-PURPLE',
        price: 4190000,
        stock_quantity: 60,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'bora-purple',
            displayValue: 'Bora Purple',
          },
        ],
        imageUrl: 'https://image-us.samsung.com/buds2pro-purple.jpg',
        imageAlt: 'Samsung Galaxy Buds2 Pro Bora Purple',
      },
    ],
  },

  // ─── Sạc dự phòng ─────────────────────────────────────────────────────────
  {
    public_id: 'prod_anker_powerbank',
    name: 'Anker PowerCore 20000mAh',
    slug: 'anker-powercore-20000',
    description:
      'Sạc dự phòng dung lượng lớn 20000mAh, hỗ trợ Power Delivery 22.5W, 2 cổng USB-A + 1 USB-C.',
    price: 1250000,
    is_active: true,
    categoryNames: ['Sạc dự phòng', 'Phụ kiện'],
    variants: [
      {
        sku: 'ANKER-20K-BLACK',
        price: 1250000,
        stock_quantity: 200,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'black',
            displayValue: 'Đen',
          },
        ],
        imageUrl: 'https://cdn.anker.com/powercore-20000-black.jpg',
        imageAlt: 'Anker PowerCore 20000mAh Đen',
      },
      {
        sku: 'ANKER-20K-WHITE',
        price: 1290000,
        stock_quantity: 150,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'white',
            displayValue: 'Trắng',
          },
        ],
        imageUrl: 'https://cdn.anker.com/powercore-20000-white.jpg',
        imageAlt: 'Anker PowerCore 20000mAh Trắng',
      },
    ],
  },

  // ─── Thiết bị gia dụng ────────────────────────────────────────────────────
  {
    public_id: 'prod_xiaomi_robot',
    name: 'Xiaomi Robot Vacuum S10',
    slug: 'xiaomi-robot-s10',
    description:
      'Robot hút bụi lau nhà thông minh, lực hút 4000Pa, bản đồ LiDAR, điều khiển qua app.',
    price: 6490000,
    is_active: true,
    categoryNames: ['Robot hút bụi'],
    variants: [
      {
        sku: 'XIAOMI-S10-WHITE',
        price: 6490000,
        stock_quantity: 30,
        is_active: true,
        options: [
          {
            attributeName: 'color',
            attributeDisplayName: 'Màu sắc',
            value: 'white',
            displayValue: 'Trắng',
          },
        ],
        imageUrl: 'https://cdn.mi.com/xiaomi-robot-s10.jpg',
        imageAlt: 'Xiaomi Robot Vacuum S10 Trắng',
      },
    ],
  },
];
