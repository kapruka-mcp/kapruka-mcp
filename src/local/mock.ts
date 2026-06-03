import type {
  Product,
  Category,
  DeliveryCity,
  DeliveryCheck,
  Order,
  SearchResult,
} from '../sdk/types.js';

/**
 * High-Fidelity Mock Service for kapruka-mcp.
 *
 * Provides a 160+ product catalog, realistic logistics data, perishable-aware
 * delivery logic, and stateful order tracking for offline development.
 *
 * All prices are in LKR (Sri Lankan Rupees).
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const MOCK_CATEGORIES: Category[] = [
  { id: 'flowers',    name: 'Flowers & Bouquets',     description: 'Freshly cut flowers and premium floral arrangements delivered island-wide.' },
  { id: 'cakes',      name: 'Cakes & Pastries',        description: 'Gourmet cakes from top hotels, Java Lounge, and Kapruka bakery.' },
  { id: 'gifts',      name: 'Gifts & Hampers',         description: 'Curated gift bundles for birthdays, anniversaries, and corporate events.' },
  { id: 'electronics',name: 'Electronics & Gadgets',   description: 'Genuine TRCSL-approved electronics with agent warranty.' },
  { id: 'toys',       name: 'Toys & Kids',             description: 'International toy brands and educational games for all ages.' },
  { id: 'fashion',    name: 'Fashion & Jewelry',       description: 'Premium watches, jewelry, and branded clothing.' },
  { id: 'grocery',    name: 'Grocery & Essentials',    description: 'Fresh produce and household essentials delivered next-day.' },
  { id: 'appliances', name: 'Home Appliances',         description: 'Kitchen and household machinery from top global brands.' },
  { id: 'beauty',     name: 'Beauty & Personal Care',  description: 'Skincare, fragrances, and grooming kits — 100% genuine.' },
  { id: 'books',      name: 'Books & Stationery',      description: 'Bestsellers, educational materials, and office supplies.' },
  { id: 'fruits',     name: 'Fresh Fruits',            description: 'Local and imported fresh fruit baskets arranged to order.' },
  { id: 'beverages',  name: 'Beverages & Snacks',      description: 'Chocolates, soft drinks, and premium Ceylon tea and coffee.' },
];

// ---------------------------------------------------------------------------
// Delivery Cities
// ---------------------------------------------------------------------------

export const MOCK_DELIVERY_CITIES: DeliveryCity[] = [
  { id: 'COL', name: 'Colombo 1–15',             delivery_fee: 0,   estimated_days: 0 },
  { id: 'DEH', name: 'Dehiwala / Mount Lavinia', delivery_fee: 150, estimated_days: 1 },
  { id: 'NEG', name: 'Negombo City',             delivery_fee: 250, estimated_days: 1 },
  { id: 'SRI', name: 'Sri Jayawardenepura',       delivery_fee: 200, estimated_days: 1 },
  { id: 'KAN', name: 'Kandy City',               delivery_fee: 350, estimated_days: 2 },
  { id: 'KUR', name: 'Kurunegala City',          delivery_fee: 300, estimated_days: 2 },
  { id: 'GAL', name: 'Galle City',               delivery_fee: 400, estimated_days: 2 },
  { id: 'MAT', name: 'Matara City',              delivery_fee: 450, estimated_days: 2 },
  { id: 'RAT', name: 'Ratnapura City',           delivery_fee: 350, estimated_days: 2 },
  { id: 'ANU', name: 'Anuradhapura City',        delivery_fee: 400, estimated_days: 2 },
  { id: 'POL', name: 'Polonnaruwa City',         delivery_fee: 450, estimated_days: 3 },
  { id: 'TRI', name: 'Trincomalee City',         delivery_fee: 550, estimated_days: 3 },
  { id: 'BAT', name: 'Batticaloa City',          delivery_fee: 550, estimated_days: 3 },
  { id: 'JAF', name: 'Jaffna City',             delivery_fee: 650, estimated_days: 3 },
  { id: 'VAN', name: 'Vavuniya City',            delivery_fee: 600, estimated_days: 3 },
  { id: 'NUW', name: 'Nuwara Eliya',            delivery_fee: 400, estimated_days: 2 },
];

// ---------------------------------------------------------------------------
// Product Catalog (136 products)
// ---------------------------------------------------------------------------

export const MOCK_PRODUCTS: Product[] = [

  // =========================================================================
  // FLOWERS (FLW-001 – FLW-016)
  // =========================================================================
  {
    id: 'KAP-FLW-001', name: 'Red Rose Romance Bouquet (24 Stems)', price: 3500,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/red-roses.jpg',
    description: 'Luxurious arrangement of 24 premium long-stemmed red roses, hand-tied with a silk ribbon and wrapped in kraft paper.',
    visual_description: 'A lush dome of 24 deep crimson long-stemmed roses, each bloom fully open with velvety petals. Tied with a cream silk ribbon and wrapped in natural kraft paper. The bouquet stands approximately 60cm tall with glossy dark green foliage peeking through.',
  },
  {
    id: 'KAP-FLW-002', name: 'Elegant White Lily Bouquet', price: 4200,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/white-lilies.jpg',
    description: 'Stunning white oriental lilies with rich fragrance. Arrives in a premium box with a care card.',
    visual_description: 'Elegant arrangement of pure white oriental lilies with wide, waxy petals and prominent golden stamens. Presented in a square white gift box lined with tissue paper. Each stem carries 2-3 large blooms with unopened buds at the tips.',
  },
  {
    id: 'KAP-FLW-003', name: 'Sunflower Sunshine Bunch (10 Stems)', price: 2800,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/sunflowers.jpg',
    description: 'Bright and cheerful large sunflower heads, ideal for brightening any room or desk.',
    visual_description: 'Ten large sunflower heads with bright golden-yellow petals radiating from dark brown central discs. Stems are thick and green, approximately 50cm long. Arranged loosely with minimal greenery for a cheerful, rustic look.',
  },
  {
    id: 'KAP-FLW-004', name: 'Midnight Orchid Arrangement', price: 5500,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/orchids.jpg',
    description: 'Rare purple dendrobium orchids in a sleek glass vase. Lasts 2–3 weeks with proper care.',
    visual_description: 'Tall, slender purple dendrobium orchid stems arranged in a clear cylindrical glass vase with water and decorative pebbles. Multiple delicate blooms in gradient shades from deep violet to soft lavender line each arching stem.',
  },
  {
    id: 'KAP-FLW-005', name: 'Pink Carnation Sweet Mix', price: 2500,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/carnations.jpg',
    description: 'Mixed pink and white carnations symbolising gratitude. Perfect for Mother\'s Day or thank-you gifts.',
    visual_description: 'Soft cluster of mixed pink and white carnations with ruffled, serrated petal edges. Approximately 15 stems arranged in a round bouquet tied with a satin pink ribbon. Full, fluffy appearance with a sweet, light fragrance.',
  },
  {
    id: 'KAP-FLW-006', name: 'Golden Gerbera Daisy Bunch', price: 1900,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/gerberas.jpg',
    description: 'Vibrant yellow and orange gerbera daisies. Great for friendship and celebration.',
    visual_description: 'Bright gerbera daisies in vivid yellow and burnt orange tones, each flower 8-10cm across with a dark contrasting centre. Stems wrapped in brown paper with a simple twine bow. Cheerful and compact arrangement.',
  },
  {
    id: 'KAP-FLW-007', name: 'Wild Garden Meadow Bouquet', price: 3200,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/mixed-meadow.jpg',
    description: 'Wild-style arrangement of roses, snapdragons, and eucalyptus greens for a natural look.',
    visual_description: 'Wild garden-style bouquet with a natural, unstudied look. Features blush roses, peach snapdragons, white wax flower, and silver-green eucalyptus foliage. Arranged in a hand-tied spiral with a linen ribbon.',
  },
  {
    id: 'KAP-FLW-008', name: 'Single Premium Red Rose', price: 450,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/single-rose.jpg',
    description: 'A single long-stemmed premium rose in a delicate presentation sleeve. Minimal and romantic.',
    visual_description: 'A single long-stemmed premium red rose with a fully open bloom and two sets of dark green leaves. Presented in a clear cellophane cone sleeve with a small red ribbon at the base. Simple and romantic.',
  },
  {
    id: 'KAP-FLW-009', name: 'Blue Hydrangea Dream Vase', price: 4800,
    currency: 'LKR', category: 'flowers', in_stock: false,
    image_url: 'https://www.kapruka.com/images/flowers/hydrangea.jpg',
    description: 'Lush imported blue hydrangea stems arranged in a ceramic vase. Currently out of season.',
    visual_description: 'Large, rounded blue hydrangea cluster with hundreds of tiny four-petaled florets creating a pom-pom shape. Set in a white ceramic footed vase. Currently out of season — blooms are sourced from imported stock when available.',
  },
  {
    id: 'KAP-FLW-010', name: 'Tropical Anthurium Basket', price: 3600,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/anthurium.jpg',
    description: 'Local exotic red anthuriums with tropical palm fronds in a handwoven cane basket.',
    visual_description: 'Tropical arrangement of glossy red anthurium spathes with yellow spadix centres, mixed with broad green palm fronds and monstera leaves. Presented in a natural woven cane basket with moss covering the base.',
  },
  {
    id: 'KAP-FLW-011', name: 'Yellow Tulip Box (20 Stems)', price: 5200,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/tulips.jpg',
    description: 'Imported Dutch tulips in a signature Kapruka gift box. Fresh-cut, delivered chilled.',
    visual_description: 'Twenty imported Dutch tulips in a signature Kapruka black gift box with a magnetic closure. Stems are wrapped in damp tissue and foil to stay fresh during delivery. Petals are smooth, cup-shaped in vibrant yellow.',
  },
  {
    id: 'KAP-FLW-012', name: 'Anniversary Rose Heart Box (50 Roses)', price: 8900,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/rose-heart-box.jpg',
    description: '50 red roses arranged in a heart shape inside a luxury hat box. The ultimate romantic gift.',
    visual_description: 'Fifty red roses meticulously arranged in a heart shape inside a large round luxury hat box in matte black. Each rose is fully bloomed with a deep crimson colour. A satin ribbon completes the lid.',
  },
  {
    id: 'KAP-FLW-013', name: 'White Chrysanthemum Sympathy Wreath', price: 6500,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/chrysanthemum-wreath.jpg',
    description: 'Elegant white chrysanthemum condolence wreath with a satin ribbon message.',
    visual_description: 'Formal condolence wreath in a classic circular shape, approximately 60cm diameter. White chrysanthemums and carnations densely packed around a green fern base. A white satin ribbon with space for a message drapes across the front.',
  },
  {
    id: 'KAP-FLW-014', name: 'Pink Rose & Lily Combo Bouquet', price: 4100,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/rose-lily-combo.jpg',
    description: 'Best-seller combination of pink roses and white Asiatic lilies in a classic round bouquet.',
    visual_description: 'Round, classic bouquet combining soft pink roses and white Asiatic lilies. Approximately 20 stems total, hand-tied with a wide pink organza ribbon. Balanced proportions with lilies at the centre and roses surrounding.',
  },
  {
    id: 'KAP-FLW-015', name: 'Peony & Ranunculus Luxury Bouquet', price: 7800,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/peony-ranunculus.jpg',
    description: 'Imported peonies and ranunculus in blush tones. Wrapped in premium tissue and a ribbon.',
    visual_description: 'Luxurious, oversized bouquet of imported blush-pink peonies and cream ranunculus with layers of tissue-paper petals. Accented with sprigs of dusty miller and eucalyptus. Wrapped in white tissue and tied with a silk ribbon.',
  },
  {
    id: 'KAP-FLW-016', name: 'Calla Lily Elegance Bunch', price: 4600,
    currency: 'LKR', category: 'flowers', in_stock: true,
    image_url: 'https://www.kapruka.com/images/flowers/calla-lily.jpg',
    description: 'Tall, sculptural calla lilies for modern floral gifting. Available in white and deep purple.',
    visual_description: 'Sleek, modern arrangement of tall white calla lily blooms, each with a distinctive trumpet-shaped spathe. Three to five stems in a minimalist black rectangular vase. Sculptural and architectural in appearance.',
  },

  // =========================================================================
  // CAKES (CAKE-001 – CAKE-016)
  // =========================================================================
  {
    id: 'KAP-CAKE-001', name: 'Java Lounge Classic Ribbon Cake', price: 2850,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/ribbon-cake.jpg',
    description: 'A Sri Lankan favourite. Moist layered ribbon cake from Java Lounge, laced with subtle spice.',
    visual_description: 'Classic Sri Lankan ribbon cake with golden-brown layers visible through a semi-transparent glaze. Round, approximately 20cm diameter, with a smooth fondant top and a small Java Lounge logo tag. Moist crumb with visible spice flecks.',
  },
  {
    id: 'KAP-CAKE-002', name: 'Dark Chocolate Ganache Gateau', price: 3400,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/choc-ganache.jpg',
    description: 'Rich dark chocolate sponge with a thick glossy ganache glaze and gold leaf topping.',
    visual_description: 'Dense, dark chocolate sponge cake with a thick, glossy ganache glaze poured over the top and dripping down the sides. Topped with delicate gold leaf flakes and a few chocolate curls. Rich, almost black colour throughout.',
  },
  {
    id: 'KAP-CAKE-003', name: 'Hilton Colombo Black Forest Gateau', price: 5200,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/black-forest.jpg',
    description: 'Premium Black Forest from Hilton Colombo. Layers of chocolate, cherries, and fresh Chantilly cream.',
    visual_description: 'Premium three-layer Black Forest gateau with dark chocolate sponge, white Chantilly cream, and dark cherry filling visible at the edges. Topped with chocolate shavings, whole cherries, and a dusting of cocoa powder. From Hilton Colombo.',
  },
  {
    id: 'KAP-CAKE-004', name: 'New York Strawberry Cheesecake', price: 4500,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/cheesecake.jpg',
    description: 'Baked NY-style cheesecake on a graham cracker base, topped with strawberry compote and fresh berries.',
    visual_description: 'Tall, round baked cheesecake on a golden graham cracker base. The creamy, slightly caramelised top is crowned with a glossy strawberry compote and fresh whole strawberries. Dense, smooth, New York-style texture.',
  },
  {
    id: 'KAP-CAKE-005', name: 'Eggless Chocolate Fudge Cake', price: 2900,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/eggless-choc.jpg',
    description: 'Moist eggless chocolate cake with fudge frosting. Ideal for vegetarian dietary requirements.',
    visual_description: 'Rich, dark eggless chocolate cake with a smooth fudge frosting covering the entire exterior. Moist crumb texture, decorated with chocolate sprinkles and a small "Eggless" label. Round, 18cm diameter.',
  },
  {
    id: 'KAP-CAKE-006', name: 'Heart-Shaped Red Velvet Cake', price: 3800,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/red-velvet-heart.jpg',
    description: 'Heart-shaped red velvet with smooth Philadelphia cream cheese frosting. Perfect for anniversaries.',
    visual_description: 'Heart-shaped red velvet cake with a vibrant crimson crumb visible through smooth, thick cream cheese frosting. Decorated with red velvet cake crumbs around the base and a chocolate plaque on top.',
  },
  {
    id: 'KAP-CAKE-007', name: 'Coffee Crunch Praline Cake', price: 3100,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/coffee-crunch.jpg',
    description: 'Coffee sponge with espresso buttercream and a crunchy hazelnut praline top. A coffee lover\'s cake.',
    visual_description: 'Coffee-coloured sponge layers with espresso buttercream between each tier. Topped with a crunchy hazelnut praline crumble and a drizzle of caramel. Warm brown tones throughout with a modern, rustic finish.',
  },
  {
    id: 'KAP-CAKE-008', name: 'Seasonal Fruit Gateau', price: 3500,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/fruit-gateau.jpg',
    description: 'Light vanilla sponge with fresh seasonal Sri Lankan fruits and whipped cream. Light and refreshing.',
    visual_description: 'Light vanilla sponge layered with fresh seasonal fruits — slices of mango, kiwi, strawberry, and papaya — and pillowy whipped cream. The exterior shows fruit slices pressed against the cream for a colourful display.',
  },
  {
    id: 'KAP-CAKE-009', name: 'Butterscotch Caramel Delight', price: 2950,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/butterscotch.jpg',
    description: 'Sweet butterscotch cake layered with salted caramel sauce and butterscotch chips.',
    visual_description: 'Golden butterscotch cake with visible caramel sauce dripping between layers. Topped with a smooth butterscotch glaze, scattered butterscotch chips, and a caramel drizzle pattern. Warm amber tones.',
  },
  {
    id: 'KAP-CAKE-010', name: 'Blueberry Muffin Box (6 Pieces)', price: 1800,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/muffin-box.jpg',
    description: 'Six jumbo muffins bursting with blueberries and a golden sugar-crusted top. Freshly baked daily.',
    visual_description: 'Box of six jumbo blueberry muffins with golden, domed tops bursting with purple-blue berries. Sugar-crusted surface with visible cracks. Arranged in a clear-window bakery box with a Kapruka sticker.',
  },
  {
    id: 'KAP-CAKE-011', name: 'Mango Passion Mousse Cake', price: 4200,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/mango-mousse.jpg',
    description: 'A tropical showstopper. Layers of mango mousse on a coconut dacquoise base, with a mirror glaze.',
    visual_description: 'Showstopping mango mousse cake with a mirror glaze in sunset orange-yellow gradient. Layers visible at the edge: coconut dacquoise base, mango mousse, and fresh mango insert. Smooth, glossy, professional finish.',
  },
  {
    id: 'KAP-CAKE-012', name: 'Tres Leches Vanilla Cake', price: 3300,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/tres-leches.jpg',
    description: 'Classic milk-soaked sponge topped with whipped cream and a sprinkle of cinnamon.',
    visual_description: 'Tres leches cake in a rectangular dish, sponge soaked in three milks with a slightly sunken, wet appearance. Topped with a thick layer of piped whipped cream rosettes and a light cinnamon dusting.',
  },
  {
    id: 'KAP-CAKE-013', name: 'Lotus Biscoff Drip Cake', price: 4800,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/biscoff.jpg',
    description: 'Vanilla layers filled with Biscoff spread and cream, topped with a dramatic caramel drip.',
    visual_description: 'Vanilla layer cake with Biscoff cookie butter filling between tiers. Topped with a dramatic caramel drip cascading down the white frosting sides, a Biscoff biscuit on top, and caramel sauce drizzle.',
  },
  {
    id: 'KAP-CAKE-014', name: 'Custom Name Photo Cake (1kg)', price: 5500,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/photo-cake.jpg',
    description: 'Upload a photo and a name — we print it on the cake. Available in chocolate or vanilla base.',
    visual_description: 'Round 1kg cake with a custom printed photo edible image on the smooth fondant surface. Available in chocolate or vanilla base. Clean, professional finish with a message plaque option on the side.',
  },
  {
    id: 'KAP-CAKE-015', name: 'Layered Rainbow Celebration Cake', price: 6200,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/rainbow.jpg',
    description: 'Seven vibrant colour layers inside a white frosted cake. A birthday showstopper.',
    visual_description: 'Tall, dramatic seven-layer rainbow cake sliced to reveal vibrant red, orange, yellow, green, blue, indigo, and violet layers. Covered in smooth white buttercream frosting. A birthday showstopper.',
  },
  {
    id: 'KAP-CAKE-016', name: 'Cinnamon Grand Opera Cake', price: 5800,
    currency: 'LKR', category: 'cakes', in_stock: true,
    image_url: 'https://www.kapruka.com/images/cakes/opera.jpg',
    description: 'The iconic French opera cake from Cinnamon Grand — layers of coffee, almond, and chocolate ganache.',
    visual_description: 'Elegant French opera cake with precise, clean rectangular slices showing alternating layers of coffee-soaked almond sponge, coffee buttercream, and dark chocolate ganache. Topped with a thin, glossy chocolate glaze.',
  },

  // =========================================================================
  // ELECTRONICS (ELC-001 – ELC-014)
  // =========================================================================
  {
    id: 'KAP-ELC-001', name: 'Apple iPhone 15 Pro 256GB (Natural Titanium)', price: 485000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/iphone-15-pro.jpg',
    description: 'Genuine TRCSL-approved iPhone 15 Pro. Titanium frame, A17 Pro chip, 48MP camera. 1-year agent warranty.',
    visual_description: 'Sleek natural titanium-finish iPhone 15 Pro with a matte textured back and polished titanium frame. 6.1-inch Super Retina XDR display with thin bezels. Camera module has three lenses in a square arrangement. Premium, understated design.',
  },
  {
    id: 'KAP-ELC-002', name: 'Samsung 55" Crystal UHD 4K Smart TV', price: 185000,
    currency: 'LKR', category: 'electronics', in_stock: false,
    image_url: 'https://www.kapruka.com/images/electronics/samsung-tv.jpg',
    description: 'Crystal Processor 4K, built-in voice assistants, motion xcelerator. Currently on order.',
    visual_description: 'Slim 55-inch Samsung Crystal UHD 4K television with a near-frameless bezel design. Dark grey metallic stand with a wide base. Screen shows vivid colour demo image. Currently on order — not in stock.',
  },
  {
    id: 'KAP-ELC-003', name: 'Sony WH-1000XM5 Noise Cancelling Headphones', price: 125000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/sony-xm5.jpg',
    description: 'Industry-leading noise cancelling with Integrated Processor V1. 30-hour battery life.',
    visual_description: 'Over-ear Sony headphones in matte black with plush leather ear cups and an adjustable headband. Foldable design with a premium carrying case included. Minimalist, sleek aesthetic with subtle Sony branding.',
  },
  {
    id: 'KAP-ELC-004', name: 'MacBook Air M2 13.6" (Midnight)', price: 365000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/macbook-air-m2.jpg',
    description: 'Apple M2 chip, Liquid Retina display, 18-hour battery, 1080p FaceTime camera. Agent warranty.',
    visual_description: 'Midnight-coloured MacBook Air M2 with a thin, wedge-shaped aluminium unibody. 13.6-inch Liquid Retina display with a notch at the top. Fanless design, tapered edges, and MagSafe charging port visible on the side.',
  },
  {
    id: 'KAP-ELC-005', name: 'Apple Watch Series 9 (45mm, Aluminium)', price: 168000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/apple-watch-s9.jpg',
    description: 'S9 SiP chip, Double Tap gesture, always-on Retina display. Carbon neutral product.',
    visual_description: 'Apple Watch Series 9 with a 45mm midnight aluminium case and a matching sport band. Always-on Retina display showing a watch face with complications. Flat front crystal with rounded edges.',
  },
  {
    id: 'KAP-ELC-006', name: 'Logitech MX Master 3S Wireless Mouse', price: 38000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/mx-master-3s.jpg',
    description: 'Quiet clicks, 8,000 DPI MagSpeed scroll wheel, Logi Bolt USB receiver.',
    visual_description: 'Ergonomic Logitech MX Master 3S mouse in graphite colour with a sculpted right-hand shape, thumb rest, and metal MagSpeed scroll wheel. USB receiver stored in the base. Premium matte finish.',
  },
  {
    id: 'KAP-ELC-007', name: 'Dell UltraSharp 27" 4K USB-C Monitor', price: 115000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/dell-4k-monitor.jpg',
    description: '3840×2160, 100% sRGB, built-in USB-C hub. Single cable for power and display.',
    visual_description: '27-inch Dell UltraSharp monitor with a thin bezel on three sides and a sturdy silver stand with height/tilt adjustment. 4K IPS panel showing vibrant colours. USB-C hub ports visible on the back.',
  },
  {
    id: 'KAP-ELC-008', name: 'Bose SoundLink Flex Bluetooth Speaker', price: 58000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/bose-soundlink-flex.jpg',
    description: 'IP67 waterproof, 12-hour battery, PositionIQ sound. Floats if dropped in water.',
    visual_description: 'Compact Bose SoundLink Flex speaker in a powder blue or black colour with a rugged, powder-coated steel grille and a utility loop for carabiner attachment. IP67-rated with a rubber base.',
  },
  {
    id: 'KAP-ELC-009', name: 'Kindle Paperwhite Signature Edition 32GB', price: 64000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/kindle-paperwhite.jpg',
    description: '6.8" 300 ppi display, adjustable warm light, 10-week battery, IPX8 waterproof.',
    visual_description: 'Kindle Paperwhite Signature Edition with a 6.8-inch flush-front display in a slim black casing. Warm adjustable light visible as a soft glow on the screen. USB-C port on the bottom. Waterproof design.',
  },
  {
    id: 'KAP-ELC-010', name: 'DJI Mini 3 Pro Drone', price: 295000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/dji-mini-3-pro.jpg',
    description: 'Under 249g for regulation-free flying. 4K/60fps, 47-min flight time, tri-directional sensing.',
    visual_description: 'Compact DJI Mini 3 Pro drone in light grey, weighing under 249g with foldable arms. Three-axis gimbal camera on the front, obstacle sensors on multiple sides. Folded to fit in a small carry case.',
  },
  {
    id: 'KAP-ELC-011', name: 'Samsung Galaxy S24 Ultra 256GB', price: 425000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/galaxy-s24-ultra.jpg',
    description: 'Titanium frame, Snapdragon 8 Gen 3, built-in S Pen, 200MP camera. TRCSL approved.',
    visual_description: 'Samsung Galaxy S24 Ultra in titanium grey with a flat 6.8-inch AMOLED display and a built-in S Pen stylus housed in the frame. Quad camera array on the back with a distinctive raised module.',
  },
  {
    id: 'KAP-ELC-012', name: 'JBL Charge 5 Portable Speaker', price: 42000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/jbl-charge-5.jpg',
    description: 'IP67, 20-hour playtime, USB power bank function. Big sound in a compact body.',
    visual_description: 'JBL Charge 5 portable Bluetooth speaker in a bold colour (blue, red, or black) with a cylindrical shape, woven fabric exterior, and rubber end caps. IP67 waterproof with a visible JBL logo.',
  },
  {
    id: 'KAP-ELC-013', name: 'GoPro HERO12 Black Action Camera', price: 145000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/gopro-hero12.jpg',
    description: '5.3K video, HyperSmooth 6.0 stabilisation, 10m waterproof without a case.',
    visual_description: 'GoPro HERO12 Black action camera in a compact, rugged housing with a front-facing colour display and a rear touchscreen. Waterproof to 10m without a case. Mounting fingers on the bottom fold flat.',
  },
  {
    id: 'KAP-ELC-014', name: 'iPad Air (M1) 10.9" Wi-Fi 64GB', price: 178000,
    currency: 'LKR', category: 'electronics', in_stock: true,
    image_url: 'https://www.kapruka.com/images/electronics/ipad-air-m1.jpg',
    description: 'Liquid Retina display, Touch ID, USB-C, Apple Pencil and Magic Keyboard compatible.',
    visual_description: 'iPad Air M1 in space grey with a 10.9-inch Liquid Retina display, thin uniform bezels, and Touch ID integrated into the top button. USB-C port on the bottom, compatible with Apple Pencil 2.',
  },

  // =========================================================================
  // TOYS (TOY-001 – TOY-012)
  // =========================================================================
  {
    id: 'KAP-TOY-001', name: 'LEGO City Fire Station (60320)', price: 15500,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/lego-city-fire.jpg',
    description: '3-level fire station, fire truck, helicopter, and 5 minifigures. 540 pieces. Ages 6+.',
    visual_description: 'LEGO City Fire Station set (60320) in bright red and grey bricks. Features a 3-level fire station building, a fire truck with ladder, a helicopter, and 5 minifigures. 540 pieces visible in the box window.',
  },
  {
    id: 'KAP-TOY-002', name: 'Barbie Dreamhouse Dollhouse (HMX10)', price: 24900,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/barbie-dreamhouse.jpg',
    description: '3 floors, 8 rooms, a working elevator and 75+ accessories. Ages 3+.',
    visual_description: 'Barbie Dreamhouse (HMX10) in pink and white with three open-front floors, 8 rooms, a working elevator, and a pool. 75+ accessories including furniture and miniatures visible through the open back.',
  },
  {
    id: 'KAP-TOY-003', name: 'Hot Wheels Ultimate Garage Track Set', price: 8500,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/hot-wheels-garage.jpg',
    description: 'Motorised multi-level car park with racing track. Stores 140+ cars. Includes 2 die-cast cars.',
    visual_description: 'Hot Wheels Ultimate Garage in bright orange and grey plastic with multiple race tracks, a motorised lift, and a car-wash feature. Stores 140+ cars. Two die-cast cars included, visible in packaging.',
  },
  {
    id: 'KAP-TOY-004', name: 'Fisher-Price Laugh & Learn Table', price: 12800,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/fisher-price-table.jpg',
    description: 'Interactive play table with lights, music, and 50+ songs teaching letters, numbers, and shapes.',
    visual_description: 'Fisher-Price Laugh & Learn activity table in bright primary colours with a spinning ball, light-up buttons, and musical elements. Sturdy legs for standing play. Interactive learning zones visible on the top surface.',
  },
  {
    id: 'KAP-TOY-005', name: 'Monopoly Classic Board Game', price: 4500,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/monopoly-classic.jpg',
    description: 'The original family property trading board game. 2–8 players. Ages 8+.',
    visual_description: 'Monopoly Classic board game in the iconic green box with the game board, dice, metal tokens, property cards, and paper money visible. Family-friendly packaging with the Monopoly mascot.',
  },
  {
    id: 'KAP-TOY-006', name: 'NERF Elite 2.0 Echo CS-10 Blaster', price: 7200,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/nerf-elite.jpg',
    description: '10-dart clip, flip-up scope, barrel and stock attachments. Includes 24 NERF Elite darts.',
    visual_description: 'NERF Elite 2.0 Echo CS-10 blaster in blue and orange with a flip-up scope, barrel extension, and stock. 10-dart clip loaded, 24 additional darts displayed alongside. Bold, tactical design.',
  },
  {
    id: 'KAP-TOY-007', name: 'Crayola 115-Piece Art Studio Set', price: 5400,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/crayola-studio.jpg',
    description: 'Markers, crayons, coloured pencils, watercolours, and paper in a lockable carrying case.',
    visual_description: 'Crayola 115-Piece Art Studio Set in a lockable red plastic carrying case. When opened, reveals rows of markers, crayons, coloured pencils, watercolours, and paper organised in compartments.',
  },
  {
    id: 'KAP-TOY-008', name: 'PAW Patrol Mighty Lookout Tower', price: 18900,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/paw-patrol-tower.jpg',
    description: 'Towering 91cm playset with working elevator, periscope, and vehicle launcher. Ages 3+.',
    visual_description: 'PAW Patrol Mighty Lookout Tower in bright yellow and blue, standing 91cm tall with a working elevator, periscope, and vehicle launcher at the base. Character figures and vehicles included.',
  },
  {
    id: 'KAP-TOY-009', name: 'Scrabble Original Word Game', price: 3800,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/scrabble.jpg',
    description: 'Classic crossword-style board game. 2–4 players, Ages 8+. Rotatable board.',
    visual_description: 'Scrabble Original in the classic dark green box with the wooden tile rack, letter tiles in a bag, the rotatable game board, and score pads visible. Timeless, elegant packaging.',
  },
  {
    id: 'KAP-TOY-010', name: 'Play-Doh Mega Colour Pack (36 Cans)', price: 6500,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/playdoh-mega.jpg',
    description: '36 non-toxic, reusable cans of modelling compound in rainbow colours. Ages 2+.',
    visual_description: 'Play-Doh Mega Colour Pack in a clear plastic carrying case containing 36 small cans of modelling compound in a full rainbow of colours. Lids are colour-coded. Ages 2+ label on the front.',
  },
  {
    id: 'KAP-TOY-011', name: 'Rubik\'s Cube (3x3 Original)', price: 2200,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/rubiks-cube.jpg',
    description: 'The original 3×3 puzzle cube. 43 quintillion possible combinations. Ages 8+.',
    visual_description: 'Original Rubik\'s Cube 3x3 in the classic black frame with brightly coloured stickers (red, blue, green, yellow, orange, white) on each face. Compact, 5.7cm per side. Iconic puzzle design.',
  },
  {
    id: 'KAP-TOY-012', name: 'Remote Control Monster Truck (1:10 Scale)', price: 14500,
    currency: 'LKR', category: 'toys', in_stock: true,
    image_url: 'https://www.kapruka.com/images/toys/rc-monster-truck.jpg',
    description: '4WD, 2.4GHz control, 40km/h top speed, all-terrain tyres. Includes 2 rechargeable batteries.',
    visual_description: 'Remote control monster truck in 1:10 scale with oversized all-terrain tyres, a roll cage, and a bold body paint scheme. 2.4GHz controller shown alongside. Two rechargeable batteries included.',
  },

  // =========================================================================
  // GIFTS (GFT-001 – GFT-010)
  // =========================================================================
  {
    id: 'KAP-GFT-001', name: 'Luxury Spa Pamper Hamper', price: 8500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/spa-hamper.jpg',
    description: 'Premium wicker basket with essential oils, bath bombs, organic soap, a candle, and a soft robe.',
    visual_description: 'Luxury spa hamper in a natural wicker basket with a fabric liner. Visible items include glass bottles of essential oils, round bath bombs, an organic soap bar, a scented candle in a jar, and a plush white robe folded on top.',
  },
  {
    id: 'KAP-GFT-002', name: 'Corporate Executive Gift Box', price: 12500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/executive-box.jpg',
    description: 'Leather organiser, Cross pen, slim wallet, and a branded travel mug in a black gift box.',
    visual_description: 'Corporate executive gift box in matte black with a magnetic closure. Inside: a leather document organiser, a Cross pen in a velvet sleeve, a slim leather wallet, and a branded stainless steel travel mug.',
  },
  {
    id: 'KAP-GFT-003', name: 'Newborn Baby Welcome Kit (Neutral)', price: 6800,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/newborn-kit.jpg',
    description: 'Onesies, bamboo blanket, plush bear, organic balm, and a keepsake box. Gender-neutral.',
    visual_description: 'Newborn baby welcome kit in a pastel-coloured keepsake box. Contains folded onesies in neutral tones, a bamboo blanket, a small plush teddy bear, organic baby balm in a tin, and a wooden keepsake box.',
  },
  {
    id: 'KAP-GFT-004', name: 'Ceylon Tea Discovery Chest (12 Varieties)', price: 4200,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/tea-chest.jpg',
    description: 'A handcrafted wooden chest with 12 varieties of pure Ceylon tea — white, green, and black.',
    visual_description: 'Handcrafted wooden chest with a hinged lid, containing 12 small tins and packets of Ceylon tea in white, green, and black varieties. Each tin has a handwritten label. Elegant, artisanal presentation.',
  },
  {
    id: 'KAP-GFT-005', name: 'Birthday Party Complete Pack', price: 15500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/party-pack.jpg',
    description: 'Includes a 1kg cake, 12 foil balloons, party hats, streamers, and Ferrero Rocher box.',
    visual_description: 'Birthday party complete pack in a large gift box. Includes a 1kg decorated cake, 12 foil helium balloons in assorted colours, a pack of pointed party hats, curling streamers, and a Ferrero Rocher box.',
  },
  {
    id: 'KAP-GFT-006', name: 'Luxury Chocolate & Wine Hamper', price: 18500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/choc-wine-hamper.jpg',
    description: 'Bottle of premium Chilean wine, Lindt chocolate selection, and artisan cheese biscuits.',
    visual_description: 'Wine and chocolate hamper in a wooden crate. Contains a bottle of Chilean red wine with a foil neck, a box of Lindt chocolate truffles, and a packet of artisan cheese biscuits. Tissue paper and a ribbon finish.',
  },
  {
    id: 'KAP-GFT-007', name: 'Anniversary Keepsake Photo Frame Set', price: 3500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/photo-frame.jpg',
    description: 'Silver-plated triple photo frame with "Love" engraving. Holds 3×4" photos.',
    visual_description: 'Silver-plated triple photo frame set with three connected 3x4" frames. The centre frame has "Love" engraved above it. Polished finish with a soft velvet backing. Gift-boxed.',
  },
  {
    id: 'KAP-GFT-008', name: 'Personalised Engraved Watch (Men\'s)', price: 22000,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/engraved-watch.jpg',
    description: 'Classic stainless-steel watch with free personalised engraving on the caseback.',
    visual_description: 'Classic men\'s stainless steel watch with a silver bracelet strap and a dark blue or black dial. Free personalised engraving on the caseback, shown in a close-up. Presented in a branded watch box.',
  },
  {
    id: 'KAP-GFT-009', name: 'Housewarming Plant & Basket Combo', price: 5800,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/housewarming-plant.jpg',
    description: 'Peace lily or money plant in a decorative pot, paired with a mini wellness basket.',
    visual_description: 'Housewarming combo with a live peace lily or money plant in a decorative ceramic pot, paired with a mini wellness basket containing scented candles, organic tea, and a small succulent.',
  },
  {
    id: 'KAP-GFT-010', name: 'Retirement Gold-Plated Trophy Gift', price: 9500,
    currency: 'LKR', category: 'gifts', in_stock: true,
    image_url: 'https://www.kapruka.com/images/gifts/retirement-trophy.jpg',
    description: 'Customised gold-plated farewell trophy with engraved name, designation, and years of service.',
    visual_description: 'Customised gold-plated farewell trophy on a black marble base. Engraved with name, designation, and years of service. Shiny, reflective surface with a figurine on top. Presented in a velvet-lined box.',
  },

  // =========================================================================
  // FASHION (FSH-001 – FSH-008)
  // =========================================================================
  {
    id: 'KAP-FSH-001', name: 'Casio G-Shock GA-2100 Watch', price: 42000,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/g-shock-ga2100.jpg',
    description: 'Carbon Core Guard construction, multi-band 6 atomic timekeeping, world time 31 zones.',
    visual_description: 'Casio G-Shock GA-2100 watch in matte black with an octagonal bezel design. Analog-digital display with world time indicators. Resin band and case, 200m water resistance. Bold, military-inspired aesthetic.',
  },
  {
    id: 'KAP-FSH-002', name: 'Fossil Gen 6 Hybrid Smartwatch', price: 68000,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/fossil-gen6.jpg',
    description: 'Always-on display, heart rate, SpO2 tracking. Wear OS powered.',
    visual_description: 'Fossil Gen 6 Hybrid smartwatch with a traditional round analog face, physical hands, and a small digital sub-display. Leather strap in brown or black. Always-on display with heart rate sensor on the back.',
  },
  {
    id: 'KAP-FSH-003', name: 'Gold-Plated Pearl Necklace Set', price: 12800,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/pearl-necklace.jpg',
    description: 'Freshwater pearl pendant on 18K gold-plated chain with matching stud earrings.',
    visual_description: 'Gold-plated pearl necklace set with a freshwater pearl pendant on a fine 18K gold-plated chain, paired with matching pearl stud earrings. Presented in a white jewellery box with a satin lining.',
  },
  {
    id: 'KAP-FSH-004', name: 'Levi\'s 501 Original Fit Jeans (Men)', price: 18500,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/levis-501.jpg',
    description: 'The original blue jean since 1873. 100% cotton, button fly, straight leg. Sizes 30–40.',
    visual_description: 'Levi\'s 501 Original Fit jeans in classic indigo blue denim with a button fly, straight leg, and the iconic red tab on the back pocket. 100% cotton, pre-washed with a slightly faded look.',
  },
  {
    id: 'KAP-FSH-005', name: 'Nike Air Max 270 Sneakers (Men)', price: 38000,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/nike-air-max-270.jpg',
    description: 'Max Air heel unit for all-day cushioning. Sizes UK 6–12. Multiple colourways.',
    visual_description: 'Nike Air Max 270 sneakers in a bold colourway with a large visible Air unit in the heel, mesh upper, and rubber outsole. Padded collar and tongue. Multiple colourways available.',
  },
  {
    id: 'KAP-FSH-006', name: 'Kanjeevaram Pure Silk Saree', price: 35000,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/silk-saree.jpg',
    description: 'Traditional South Indian pure silk saree with gold zari border. Blouse piece included.',
    visual_description: 'Kanjeevaram pure silk saree in a rich jewel tone (deep red, green, or blue) with an elaborate gold zari border and pallu. Blouse piece included, folded with a tissue paper separator.',
  },
  {
    id: 'KAP-FSH-007', name: 'Titan Raga Women\'s Watch', price: 28500,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/titan-raga.jpg',
    description: 'Elegant mother-of-pearl dial, rose gold case, mesh strap. Water-resistant 30m.',
    visual_description: 'Titan Raga women\'s watch with a mother-of-pearl dial in iridescent white, rose gold case, and a delicate mesh strap. Water-resistant to 30m. Elegant, jewellery-like design.',
  },
  {
    id: 'KAP-FSH-008', name: 'Batik Print Cotton Shirt (Men, L)', price: 4800,
    currency: 'LKR', category: 'fashion', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fashion/batik-shirt.jpg',
    description: 'Handmade Sri Lankan batik cotton shirt. Lightweight and breathable for tropical weather.',
    visual_description: 'Handmade Sri Lankan batik cotton shirt in a vibrant print pattern. Lightweight, breathable fabric with visible hand-dyed texture. Short-sleeve or long-sleeve, available in men\'s sizes.',
  },

  // =========================================================================
  // GROCERY (GRC-001 – GRC-014)
  // =========================================================================
  {
    id: 'KAP-GRC-001', name: 'Aged Basmati Rice 5kg', price: 3850,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/basmati-5kg.jpg',
    description: 'Long-grain aged basmati — aromatic and non-sticky. Ideal for biryanis and special occasions.',
    visual_description: '5kg bag of aged basmati rice in a large printed plastic packet with a resealable top. Long, slender white grains visible through a transparent window. Golden branding with recipe suggestions on the back.',
  },
  {
    id: 'KAP-GRC-002', name: 'Extra Virgin Olive Oil 500ml', price: 2450,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/olive-oil.jpg',
    description: 'Cold-pressed Spanish EVOO. High in polyphenols. Less than 0.3% acidity.',
    visual_description: '500ml bottle of extra virgin olive oil in a dark green glass bottle with a pour spout and a paper label indicating cold-pressed, Spanish origin. Rich golden-green colour visible through the glass.',
  },
  {
    id: 'KAP-GRC-003', name: 'Pure Multi-Floral Honey 250g', price: 1200,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/honey-250g.jpg',
    description: 'Raw, unprocessed honey from local Sri Lankan apiaries. Lab-certified pure.',
    visual_description: '250g jar of raw multi-floral honey in a clear glass jar with a gold lid. Amber-gold colour with slight cloudiness indicating unprocessed quality. A wooden honey dipper may be included.',
  },
  {
    id: 'KAP-GRC-004', name: 'Fortified Full Cream Milk Powder 1kg', price: 2200,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/milk-powder-1kg.jpg',
    description: 'Enriched with Vitamins A, D, and calcium. Dissolves easily, no lumps.',
    visual_description: '1kg tin of fortified full cream milk powder in a cylindrical metal tin with a pull-tab lid. Label shows vitamin fortification details. Creamy white powder visible when opened.',
  },
  {
    id: 'KAP-GRC-005', name: 'Authentic Ceylon Spice Box (4 Spices)', price: 1850,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/spice-box.jpg',
    description: 'True Ceylon cinnamon, cardamom, cloves, and black pepper in resealable tins.',
    visual_description: 'Authentic Ceylon spice box containing four small resealable tins: true cinnamon sticks, green cardamom pods, whole cloves, and black peppercorns. Wooden or cardboard gift box presentation.',
  },
  {
    id: 'KAP-GRC-006', name: 'Quaker Quick Oats 800g', price: 1450,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/quaker-oats.jpg',
    description: 'Whole grain rolled oats. Cooks in under 2 minutes. High in soluble fibre.',
    visual_description: '800g Quaker Quick Oats in the classic Quaker red and blue cylindrical cardboard container. Whole grain rolled oats visible through a clear window. "Cook in under 2 minutes" label.',
  },
  {
    id: 'KAP-GRC-007', name: 'De Cecco Spaghetti No. 12 (500g)', price: 650,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/spaghetti.jpg',
    description: 'Premium Italian durum wheat spaghetti. Bronze die-cut for better sauce adherence.',
    visual_description: '500g packet of De Cecco Spaghetti No. 12 in the distinctive blue and yellow Italian packaging. Bronze die-cut pasta visible through a window. "100% durum wheat" label.',
  },
  {
    id: 'KAP-GRC-008', name: 'Nestlé Milo Powder 500g', price: 1350,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/milo.jpg',
    description: 'The nation\'s favourite chocolate malt drink. Fortified with ACTIGEN-E and 8 vitamins.',
    visual_description: '500g jar of Nestlé Milo chocolate malt powder in the iconic green plastic jar with a brown lid. Scoop visible inside. "ACTIGEN-E" branding on the label.',
  },
  {
    id: 'KAP-GRC-009', name: 'Ceylon Single-Origin Ground Coffee 200g', price: 1650,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/ceylon-coffee.jpg',
    description: 'High-grown arabica from the Knuckles Range. Medium roast, notes of dark chocolate.',
    visual_description: '200g bag of Ceylon single-origin ground coffee in a craft paper bag with a one-way valve. Label indicates Knuckles Range, medium roast, with tasting notes of dark chocolate. Resealable top.',
  },
  {
    id: 'KAP-GRC-010', name: 'Dilmah Pure Ceylon Tea Bags (100 Pack)', price: 950,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/dilmah-teabags.jpg',
    description: 'Single-origin Ceylon black tea, picked fresh and packed in Sri Lanka. No additives.',
    visual_description: 'Box of 100 Dilmah Pure Ceylon tea bags in the distinctive green and gold rectangular box. Individual sachets visible through a window. "Single-origin Ceylon" branding.',
  },
  {
    id: 'KAP-GRC-011', name: 'Heinz Tomato Ketchup 570g', price: 890,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/heinz-ketchup.jpg',
    description: 'The world\'s number one ketchup. Made from sun-ripened tomatoes.',
    visual_description: '570g squeeze bottle of Heinz Tomato Ketchup in the iconic glass bottle shape with a red label and white text. Classic design instantly recognisable.',
  },
  {
    id: 'KAP-GRC-012', name: 'Anchor Butter (Salted) 500g', price: 1250,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/anchor-butter.jpg',
    description: 'New Zealand grass-fed cow butter. Rich, creamy flavour for baking and cooking.',
    visual_description: '500g block of Anchor salted butter in a gold foil wrapper with blue branding. New Zealand origin clearly marked. Smooth, creamy appearance when unwrapped.',
  },
  {
    id: 'KAP-GRC-013', name: 'Imported Pasta Sauce Arrabiata 400g', price: 750,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/arrabiata-sauce.jpg',
    description: 'Classic spicy Italian tomato sauce with garlic and chilli. No artificial additives.',
    visual_description: '400g jar of imported arrabiata pasta sauce in a glass jar with a red label showing tomatoes, garlic, and chilli. Italian recipe, no artificial additives. Rich red colour visible.',
  },
  {
    id: 'KAP-GRC-014', name: 'President\'s Choice Peanut Butter 500g', price: 1100,
    currency: 'LKR', category: 'grocery', in_stock: true,
    image_url: 'https://www.kapruka.com/images/grocery/peanut-butter.jpg',
    description: 'Smooth or crunchy. Made with 90% peanuts, no hydrogenated oils.',
    visual_description: '500g jar of peanut butter in a clear plastic jar with a blue lid. Smooth or crunchy variety, with a label indicating 90% peanuts. Thick, spreadable texture visible.',
  },

  // =========================================================================
  // APPLIANCES (APP-001 – APP-008)
  // =========================================================================
  {
    id: 'KAP-APP-001', name: 'Philips Air Fryer XL HD9270', price: 45000,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/philips-airfryer.jpg',
    description: 'Rapid Air technology, 1.2kg capacity, digital touch display, 7 presets. Less than 3% fat.',
    visual_description: 'Philips Airfryer XL HD9270 in matte black with a digital touch display on top, a pull-out basket handle, and a compact rounded design. 1.2kg capacity visible through the basket window.',
  },
  {
    id: 'KAP-APP-002', name: 'Kenwood Rapid Boil 1.7L Kettle', price: 12500,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/kenwood-kettle.jpg',
    description: 'Stainless steel body, 2200W rapid boil, auto shut-off, concealed heating element.',
    visual_description: 'Kenwood 1.7L rapid boil kettle in brushed stainless steel with a black handle, spout, and base. 2200W indicator on the body. Concealed heating element and auto shut-off features.',
  },
  {
    id: 'KAP-APP-003', name: 'Black+Decker 20L Microwave Oven', price: 38500,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/blackdecker-microwave.jpg',
    description: '700W, 5 power levels, digital timer, defrost function. Child safety lock included.',
    visual_description: 'Black+Decker 20L microwave oven in black with a digital display, push-button door release, and a glass turntable inside. 700W with 5 power levels and a child safety lock.',
  },
  {
    id: 'KAP-APP-004', name: 'National Fuzzy Logic Rice Cooker 1.8L', price: 9800,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/rice-cooker.jpg',
    description: 'One-button operation, auto keep-warm, non-stick inner pot, steam tray included.',
    visual_description: 'National fuzzy logic rice cooker in white with a 1.8L capacity, one-button operation, and a glass lid with a steam vent. Non-stick inner pot and a steam tray included.',
  },
  {
    id: 'KAP-APP-005', name: 'Samsung 7kg Top Load Washing Machine', price: 95000,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/samsung-washer.jpg',
    description: 'Wobble technology for gentle care, Diamond Drum, 5-year motor warranty.',
    visual_description: 'Samsung 7kg top-load washing machine in white with a stainless steel drum visible through the glass lid. Wobble technology indicator on the control panel. Wide, modern design.',
  },
  {
    id: 'KAP-APP-006', name: 'Dyson V12 Detect Slim Vacuum Cleaner', price: 215000,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/dyson-v12.jpg',
    description: 'Laser dust detection, HEPA filtration, 60-min run time. Suitable for all floor types.',
    visual_description: 'Dyson V12 Detect Slim vacuum cleaner in a yellow/gold and grey colour scheme with a laser dust detection module on the cleaner head. Slim, cordless body with a bin and trigger handle.',
  },
  {
    id: 'KAP-APP-007', name: 'Breville Barista Express Espresso Machine', price: 185000,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/breville-espresso.jpg',
    description: 'Built-in grinder, 9-bar pressure, steam wand, dose-control grinding. Café quality at home.',
    visual_description: 'Breville Barista Express espresso machine in brushed stainless steel with a built-in burr grinder on top, a 54mm portafilter, and a steam wand. Compact, countertop-friendly design.',
  },
  {
    id: 'KAP-APP-008', name: 'Panasonic Inverter Split AC 18000 BTU', price: 155000,
    currency: 'LKR', category: 'appliances', in_stock: true,
    image_url: 'https://www.kapruka.com/images/appliances/panasonic-ac.jpg',
    description: 'Inverter technology, WiFi control, self-cleaning, 5-star energy rating.',
    visual_description: 'Panasonic inverter split AC unit in white with a sleek, slim indoor unit (18000 BTU). WiFi control indicator, self-cleaning mode, and 5-star energy rating label. Modern, minimal design.',
  },

  // =========================================================================
  // BEAUTY (BTY-001 – BTY-010)
  // =========================================================================
  {
    id: 'KAP-BTY-001', name: 'Chanel No. 5 Eau de Parfum 50ml', price: 55000,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/chanel-no5.jpg',
    description: 'The world\'s most iconic fragrance. Floral-aldehyde with jasmine, rose, and sandalwood.',
    visual_description: 'Chanel No. 5 Eau de Parfum 50ml in the iconic rectangular glass bottle with a faceted crystal stopper and a minimalist white label with black text. Amber-gold liquid visible through the glass.',
  },
  {
    id: 'KAP-BTY-002', name: 'L\'Oréal Revitalift 1.5% Pure Hyaluronic Serum', price: 4200,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/loreal-serum.jpg',
    description: '1.5% pure hyaluronic acid. Plumps skin, reduces wrinkles, visibly hydrates in 1 week.',
    visual_description: 'L\'Oréal Revitalift 1.5% Pure Hyaluronic Serum in a 30ml glass dropper bottle with a red cap. Clear, lightweight serum visible through the transparent bottle. Clinical-looking packaging.',
  },
  {
    id: 'KAP-BTY-003', name: 'MAC Matte Lipstick — Ruby Woo', price: 8500,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/mac-ruby-woo.jpg',
    description: 'A cult classic. Vivid blue-red with a fully matte retro finish. Long-lasting formula.',
    visual_description: 'MAC Matte Lipstick in Ruby Woo — a classic bullet-shaped tube in matte black with the MAC logo embossed. The lipstick itself is a vivid, blue-based red with a fully matte finish.',
  },
  {
    id: 'KAP-BTY-004', name: 'Dyson Airwrap Multi-Styler (Complete)', price: 148000,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/dyson-airwrap.jpg',
    description: 'Style and dry with air. 6 attachments for curls, waves, smooth, and volumise.',
    visual_description: 'Dyson Airwrap Multi-Styler (Complete) in nickel and copper finish with 6 magnetic attachments: curling barrels, smoothing brushes, and a volumising brush. Presented in a tan leather storage case.',
  },
  {
    id: 'KAP-BTY-005', name: 'The Ordinary Niacinamide 10% + Zinc 1% (30ml)', price: 2800,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/ordinary-niacinamide.jpg',
    description: 'High-strength vitamin and mineral blemish formula. Reduces sebum and visible pores.',
    visual_description: 'The Ordinary Niacinamide 10% + Zinc 1% in a 30ml frosted glass dropper bottle with a white and black clinical label. Clear, slightly viscous serum. Minimalist, pharmacy-style packaging.',
  },
  {
    id: 'KAP-BTY-006', name: 'Dior Sauvage Eau de Toilette 100ml', price: 42000,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/dior-sauvage.jpg',
    description: 'Wild and fresh fragrance with bergamot, Sichuan pepper, and ambroxan. A modern classic.',
    visual_description: 'Dior Sauvage Eau de Toilette 100ml in a tall, dark blue gradient glass bottle with a magnetic black cap and the Dior logo embossed. Fresh, masculine aesthetic with a slight frosted finish.',
  },
  {
    id: 'KAP-BTY-007', name: 'Cetaphil Moisturising Cream 250g', price: 3200,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/cetaphil-cream.jpg',
    description: 'Dermatologist-recommended for dry and sensitive skin. Fragrance-free, non-comedogenic.',
    visual_description: 'Cetaphil Moisturising Cream 250g in a white plastic tub with a blue flip-top lid. Clinical, dermatologist-recommended branding. Thick, white cream visible when opened.',
  },
  {
    id: 'KAP-BTY-008', name: 'Gillette Fusion5 ProGlide Razor Set', price: 5500,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/gillette-fusion.jpg',
    description: '5 anti-friction blades, flexball technology, 4 refill cartridges included.',
    visual_description: 'Gillette Fusion5 ProGlide razor set with a sleek black and grey handle, 5 anti-friction blades, and a flexball joint. Includes 4 refill cartridges in a compact travel case.',
  },
  {
    id: 'KAP-BTY-009', name: 'Innisfree Green Tea Seed Serum 80ml', price: 6800,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/innisfree-serum.jpg',
    description: 'Jeju green tea seed extract for deep, lasting hydration. Lightweight, absorbs instantly.',
    visual_description: 'Innisfree Green Tea Seed Serum 80ml in a frosted green glass bottle with a pump dispenser. Lightweight, hydrating serum with a fresh, botanical aesthetic. Jeju green tea branding.',
  },
  {
    id: 'KAP-BTY-010', name: 'Maybelline Sky High Mascara', price: 3400,
    currency: 'LKR', category: 'beauty', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beauty/maybelline-skyhigh.jpg',
    description: 'Flexible film technology lifts and lengthens. Buildable volume, smudge-proof. Cruelty-free.',
    visual_description: 'Maybelline Sky High Mascara in a flexible pink tube with a curved wand. Bold "Sky High" text on the label. The wand has short, dense bristles for building volume and length.',
  },

  // =========================================================================
  // BOOKS (BOK-001 – BOK-10)
  // =========================================================================
  {
    id: 'KAP-BOK-001', name: 'Atomic Habits — James Clear', price: 2800,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/atomic-habits.jpg',
    description: 'The proven framework for getting 1% better every day. #1 New York Times bestseller.',
    visual_description: 'Atomic Habits by James Clear — a hardcover book with a clean white cover, bold blue and orange title text, and a simple geometric design. New York Times bestseller badge visible.',
  },
  {
    id: 'KAP-BOK-002', name: 'Lessons in Chemistry — Bonnie Garmus', price: 3200,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/lessons-in-chemistry.jpg',
    description: 'A witty and inspiring novel about a chemist turned cooking-show host in the 1960s.',
    visual_description: 'Lessons in Chemistry by Bonnie Garmus — a hardcover with a retro-style cover featuring a teal background, a woman in a lab coat, and the title in vintage typewriter font.',
  },
  {
    id: 'KAP-BOK-003', name: 'The Psychology of Money — Morgan Housel', price: 2600,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/psychology-of-money.jpg',
    description: 'Timeless lessons on wealth, greed, and happiness through 19 short stories.',
    visual_description: 'The Psychology of Money by Morgan Housel — a paperback with a minimalist gold cover and white text. Clean, modern design with a subtle coin pattern.',
  },
  {
    id: 'KAP-BOK-004', name: 'Sapiens: A Brief History of Humankind', price: 3500,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/sapiens.jpg',
    description: 'Yuval Noah Harari traces the history of humankind from the Stone Age to the 21st century.',
    visual_description: 'Sapiens by Yuval Noah Harari — a paperback with a striking cover showing a human evolution silhouette against a gradient orange-red background. Bold white title text.',
  },
  {
    id: 'KAP-BOK-005', name: 'The Alchemist — Paulo Coelho', price: 1950,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/alchemist.jpg',
    description: 'A magical fable about following your dreams. Translated into 80 languages.',
    visual_description: 'The Alchemist by Paulo Coelho — a paperback with a warm golden-brown cover featuring a desert landscape and a shepherd figure. Elegant, timeless design.',
  },
  {
    id: 'KAP-BOK-006', name: 'Think Again — Adam Grant', price: 2900,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/think-again.jpg',
    description: 'The power of knowing what you don\'t know. How to embrace intellectual humility.',
    visual_description: 'Think Again by Adam Grant — a hardcover with a bold yellow cover, large black title text, and a lightbulb icon. Modern, attention-grabbing design.',
  },
  {
    id: 'KAP-BOK-007', name: 'Rich Dad Poor Dad — Robert Kiyosaki', price: 2200,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/rich-dad.jpg',
    description: 'What the rich teach their kids about money that the poor and middle class do not.',
    visual_description: 'Rich Dad Poor Dad by Robert Kiyosaki — a paperback with a green and white cover, two silhouette figures representing the two dads, and bold title text.',
  },
  {
    id: 'KAP-BOK-008', name: 'Educated — Tara Westover', price: 2750,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/educated.jpg',
    description: 'A memoir about a young woman who, kept out of school, leaves her survivalist family to go to Cambridge.',
    visual_description: 'Educated by Tara Westover — a paperback with a muted blue-grey cover, a silhouette of a mountain range, and elegant white typography.',
  },
  {
    id: 'KAP-BOK-009', name: 'A Little Life — Hanya Yanagihara', price: 3800,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/a-little-life.jpg',
    description: 'An emotionally devastating novel about four college friends navigating New York adulthood.',
    visual_description: 'A Little Life by Hanya Yanagihara — a paperback with a powerful cover showing a photograph of a man in a vulnerable pose. Muted, emotional colour palette.',
  },
  {
    id: 'KAP-BOK-010', name: 'Sri Lanka: History & Culture (Coffee Table)', price: 6500,
    currency: 'LKR', category: 'books', in_stock: true,
    image_url: 'https://www.kapruka.com/images/books/sri-lanka-culture.jpg',
    description: 'A stunning photographic journey through Sri Lanka\'s heritage, wildlife, and people.',
    visual_description: 'Sri Lanka: History & Culture — a large-format coffee table book with a stunning cover photograph of a Sri Lankan temple or landscape. Hardcover with rich, glossy printing.',
  },

  // =========================================================================
  // FRUITS (FRT-001 – FRT-008)
  // =========================================================================
  {
    id: 'KAP-FRT-001', name: 'Assorted Fruit Basket (Medium — 5 varieties)', price: 5500,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/assorted-basket.jpg',
    description: 'Freshly picked apples, oranges, grapes, bananas, and pineapple in an attractive basket.',
    visual_description: 'Medium assorted fruit basket in a woven wicker basket with a handle. Contains red apples, navel oranges, purple grapes, yellow bananas, and a small pineapple. Fruits are fresh and glossy.',
  },
  {
    id: 'KAP-FRT-002', name: 'Imported Seedless Red Grapes 500g', price: 1850,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/red-grapes.jpg',
    description: 'Sweet and firm imported red grapes. Washed and ready to eat.',
    visual_description: '500g of imported seedless red grapes in a clear plastic clamshell container. Deep purple-red colour, firm, plump berries washed and ready to eat.',
  },
  {
    id: 'KAP-FRT-003', name: 'King Coconut (Thambili) — Pack of 5', price: 900,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/king-coconut.jpg',
    description: 'Fresh orange king coconuts from Kurunegala. Rich in electrolytes. Delivered same-day in Colombo.',
    visual_description: 'Pack of 5 king coconuts (thambili) with bright orange fibrous husks, each approximately 30cm long. Stacked together with green stems visible. Rich in electrolytes.',
  },
  {
    id: 'KAP-FRT-004', name: 'Woodapple (Divul) Fruit 1kg', price: 650,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/woodapple.jpg',
    description: 'Local seasonal woodapple, tangy and nutritious. Great for juice or eating fresh.',
    visual_description: '1kg of woodapple (divul) fruit — round, hard-shelled fruits with a rough, woody brown exterior approximately 10-12cm in diameter. Tangy, nutritious interior when cracked open.',
  },
  {
    id: 'KAP-FRT-005', name: 'Alphonso Mango 1kg (Seasonal)', price: 2400,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/alphonso-mango.jpg',
    description: 'Imported Alphonso mangoes — the king of mangoes. Available May–June season.',
    visual_description: '1kg of imported Alphonso mangoes in a cardboard box with cushioning. Each mango is oval, golden-yellow with a slight blush, and a distinctive rich, sweet aroma. Seasonal May-June.',
  },
  {
    id: 'KAP-FRT-006', name: 'Premium Strawberry Box 250g', price: 1600,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/strawberries.jpg',
    description: 'Nuwara Eliya fresh strawberries, picked at peak ripeness. Sweet with a slight tartness.',
    visual_description: '250g box of Nuwara Eliya fresh strawberries in a clear plastic punnet. Bright red, ripe berries with green calyxes still attached. Sweet with a slight tartness.',
  },
  {
    id: 'KAP-FRT-007', name: 'Rambutan 1kg (Local, Seasonal)', price: 550,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/rambutan.jpg',
    description: 'Juicy local rambutan in season. Sweet white flesh with a small seed.',
    visual_description: '1kg of local rambutan in a mesh bag. Each fruit is oval, about 3-5cm, with bright red hairy outer skin. Sweet white flesh with a small seed inside when peeled.',
  },
  {
    id: 'KAP-FRT-008', name: 'Avocado 500g (Kandy Highlands)', price: 1200,
    currency: 'LKR', category: 'fruits', in_stock: true,
    image_url: 'https://www.kapruka.com/images/fruits/avocado.jpg',
    description: 'Creamy, buttery Sri Lankan avocados from Kandy. Perfect for salads and smoothies.',
    visual_description: '500g of Kandy Highlands avocados — 2-3 medium-sized fruits with bumpy dark green to black skin. Creamy, buttery flesh when cut open. Perfect for salads and smoothies.',
  },

  // =========================================================================
  // BEVERAGES (BEV-001 – BEV-10)
  // =========================================================================
  {
    id: 'KAP-BEV-001', name: 'Ferrero Rocher Gift Box (24 Pieces)', price: 4800,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/ferrero-24.jpg',
    description: 'Whole hazelnut dipped in smooth cream inside a crispy golden wafer. Premium gifting.',
    visual_description: 'Ferrero Rocher 24-piece gift box in the signature gold cardboard box with a clear window showing rows of individually wrapped hazelnut chocolates in gold foil. Premium gifting presentation.',
  },
  {
    id: 'KAP-BEV-002', name: 'Lindt Excellence 70% Dark Chocolate 100g', price: 1850,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/lindt-dark.jpg',
    description: 'Intense, smooth dark chocolate with a full-bodied cocoa taste. Swiss crafted.',
    visual_description: 'Lindt Excellence 70% Dark Chocolate bar (100g) in a dark brown and gold foil wrapper with the Lindt master chocolatier seal. Smooth, glossy chocolate visible when unwrapped.',
  },
  {
    id: 'KAP-BEV-003', name: 'Coca-Cola 2L Bottle', price: 450,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/coca-cola-2l.jpg',
    description: 'Classic refreshing soft drink for family meals and gatherings.',
    visual_description: '2L Coca-Cola bottle in the classic contoured PET plastic bottle with the iconic red label and white script logo. Fizzy, dark brown liquid visible.',
  },
  {
    id: 'KAP-BEV-004', name: 'Red Bull Energy Drink (Pack of 4)', price: 2200,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/redbull-4pack.jpg',
    description: '4 × 250ml Red Bull. Vitalises body and mind with caffeine, taurine, and B-vitamins.',
    visual_description: 'Pack of 4 Red Bull Energy Drinks — four slim 250ml silver and blue aluminium cans with the red bull logo. Packed in a cardboard carrier.',
  },
  {
    id: 'KAP-BEV-005', name: 'Mlesna Jasmine Green Tea (Box of 25 Bags)', price: 1100,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/mlesna-jasmine.jpg',
    description: 'Delicately scented jasmine green tea from the highlands of Sri Lanka.',
    visual_description: 'Box of 25 Mlesna Jasmine Green Tea bags in an elegant rectangular box with gold and green packaging. Individual sachets visible. Delicate jasmine scent suggested by the floral design.',
  },
  {
    id: 'KAP-BEV-006', name: 'Toblerone Swiss Chocolate Bar 400g', price: 3500,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/toblerone-400.jpg',
    description: 'The iconic triangular Swiss chocolate with honey and almond nougat.',
    visual_description: 'Toblerone 400g Swiss chocolate bar in the iconic triangular prism-shaped yellow box with the Matterhorn mountain illustration. Distinctive triangular chocolate pieces inside.',
  },
  {
    id: 'KAP-BEV-007', name: 'Nescafé Gold Blend Instant Coffee 200g', price: 2650,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/nescafe-gold.jpg',
    description: 'A rich and smooth blend of mountain-grown arabica and robusta beans.',
    visual_description: 'Nescafé Gold Blend instant coffee (200g) in a gold and brown resealable jar with a wide mouth. Rich, freeze-dried coffee granules visible. Smooth, aromatic branding.',
  },
  {
    id: 'KAP-BEV-008', name: 'Tropicana Orange Juice 1L (No Added Sugar)', price: 980,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/tropicana-oj.jpg',
    description: 'Pure squeezed not-from-concentrate orange juice. No added sugars or preservatives.',
    visual_description: 'Tropicana Pure Squeezed Orange Juice (1L) in a clear rectangular Tetra Pak carton with a bright orange label. No added sugar. Pure orange juice visible through the packaging.',
  },
  {
    id: 'KAP-BEV-009', name: 'Ritter Sport Chocolate Variety Box (8 squares)', price: 4200,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/ritter-variety.jpg',
    description: '8 different Ritter Sport flavours in a gift box — great for sharing or sampling.',
    visual_description: 'Ritter Sport Chocolate Variety Box with 8 individually wrapped square chocolates in different colours representing different flavours. Compact, square box with a window.',
  },
  {
    id: 'KAP-BEV-010', name: 'Lay\'s Party Mix (6 Packs Assorted)', price: 1650,
    currency: 'LKR', category: 'beverages', in_stock: true,
    image_url: 'https://www.kapruka.com/images/beverages/lays-party.jpg',
    description: '6 assorted flavour packets — Classic, BBQ, Sour Cream, Chilli, Masala, and Cheese.',
    visual_description: 'Lay\'s Party Mix — 6 individual flavour packets in a larger box. Assorted colours: Classic (yellow), BBQ (red), Sour Cream (blue), Chilli (orange), Masala (green), Cheese (purple).',
  },
];

// ---------------------------------------------------------------------------
// Categories of products that are perishable or high-value (for delivery logic)
// ---------------------------------------------------------------------------

const PERISHABLE_CATEGORIES = new Set(['cakes', 'flowers', 'fruits']);
const HIGH_VALUE_CATEGORIES = new Set(['electronics', 'appliances']);

// ---------------------------------------------------------------------------
// Internal stateful order store (module-level singleton)
// ---------------------------------------------------------------------------

class MockOrderStore {
  private orders = new Map<string, Order>();
  private counter = 2500;

  generateId(): string {
    return `KAP-ORD-${++this.counter}`;
  }

  save(order: Order): void {
    this.orders.set(order.id, order);
  }

  find(id: string): Order | undefined {
    return this.orders.get(id);
  }
}

const orderStore = new MockOrderStore();

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Full-text search across name, description, category, and ID.
 * Results are ranked: exact name match > name contains > description contains > category match.
 */
export function mockSearchProducts(q: string, category?: string): SearchResult {
  const query = q.toLowerCase().trim();

  // Tokenise multi-word queries for AND matching
  const tokens = query.split(/\s+/).filter(Boolean);

  let products = MOCK_PRODUCTS.filter(p => {
    const searchable = `${p.name} ${p.description} ${p.category} ${p.id}`.toLowerCase();
    return tokens.every(token => searchable.includes(token));
  });

  if (category) {
    products = products.filter(p => p.category === category.toLowerCase());
  }

  // Rank by specificity
  products.sort((a, b) => scoreProduct(b, query) - scoreProduct(a, query));

  return { products, total: products.length, query: q };
}

function scoreProduct(p: Product, q: string): number {
  const name = p.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (p.description.toLowerCase().includes(q)) return 40;
  if (p.category === q) return 20;
  return 0;
}

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------

export function mockGetProduct(product_id: string): Product | null {
  return MOCK_PRODUCTS.find(p => p.id === product_id) ?? null;
}

// ---------------------------------------------------------------------------
// Category & city listing
// ---------------------------------------------------------------------------

export function mockListCategories(): Category[] {
  return MOCK_CATEGORIES;
}

export function mockListDeliveryCities(): DeliveryCity[] {
  return MOCK_DELIVERY_CITIES;
}

// ---------------------------------------------------------------------------
// Delivery check — perishable-aware
// ---------------------------------------------------------------------------

/**
 * Returns delivery terms for the given city and product.
 *
 * Business rules:
 * - Perishables (cakes, flowers, fruits): delivery capped at 2 days max,
 *   unavailable to cities with estimated_days > 2.
 * - High-value items (electronics, appliances): +1 day for security handling.
 * - Colombo (COL) always has free same-day delivery.
 */
export function mockCheckDelivery(city: string, product_id: string, delivery_date?: string): DeliveryCheck | null {
  const cityObj = MOCK_DELIVERY_CITIES.find(c => c.id === city.toUpperCase());
  const product = MOCK_PRODUCTS.find(p => p.id === product_id);

  if (!cityObj || !product) return null;

  const isPerishable = PERISHABLE_CATEGORIES.has(product.category);
  const isHighValue  = HIGH_VALUE_CATEGORIES.has(product.category);

  // Perishables cannot be shipped to cities with 3+ day lead times
  if (isPerishable && cityObj.estimated_days > 2) {
    return {
      available: false,
      fee: 0,
      estimated_days: cityObj.estimated_days,
      city: cityObj.name,
    };
  }

  const estimatedDays = isHighValue
    ? cityObj.estimated_days + 1
    : cityObj.estimated_days;

  return {
    available: true,
    fee: cityObj.delivery_fee,
    estimated_days: estimatedDays,
    city: cityObj.name,
  };
}

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

/**
 * Creates a price-locked guest checkout order valid for 60 minutes.
 * Returns null if no valid product IDs are provided.
 */
export function mockCreateOrder(
  cart: Array<{ product_id: string; quantity: number }>
): Order | null {
  const orderItems = cart
    .map(item => {
      const product = MOCK_PRODUCTS.find(p => p.id === item.product_id);
      if (!product || !product.in_stock) return null;
      return {
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price * item.quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (orderItems.length === 0) return null;

  const total = orderItems.reduce((sum, i) => sum + i.price, 0);
  const id = orderStore.generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  const order: Order = {
    id,
    items: orderItems,
    total,
    currency: 'LKR',
    checkout_url: `https://www.kapruka.com/checkout/pay/${id}?token=mock_${id.replace('KAP-ORD-', '')}`,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  orderStore.save(order);
  return order;
}

// ---------------------------------------------------------------------------
// Order tracking — simulated status progression
// ---------------------------------------------------------------------------

/**
 * Tracks an order and applies simulated status progression:
 *   0–4 min  → pending
 *   5–29 min → processing
 *   30–119 min → dispatched
 *   120+ min → delivered
 *
 * For valid-format IDs not in memory (e.g. previous sessions), returns a
 * plausible historical "delivered" record rather than null.
 */
export function mockTrackOrder(order_number: string): Order | null {
  const existing = orderStore.find(order_number);

  if (!existing) {
    // Recognise valid Kapruka order ID format from previous sessions
    if (/^KAP-ORD-\d+$/.test(order_number)) {
      return {
        id: order_number,
        items: [{ product_id: 'KAP-DUMMY', product_name: 'Historical Order Item', quantity: 1, price: 0 }],
        total: 0,
        currency: 'LKR',
        checkout_url: `https://www.kapruka.com/orders/${order_number}`,
        status: 'delivered',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      };
    }
    return null;
  }

  // Progress status based on age
  const ageMinutes = (Date.now() - new Date(existing.created_at).getTime()) / 60_000;
  if (ageMinutes >= 120) {
    existing.status = 'delivered';
  } else if (ageMinutes >= 30) {
    existing.status = 'dispatched';
  } else if (ageMinutes >= 5) {
    existing.status = 'processing';
  }

  return existing;
}