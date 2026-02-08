# Baku Bus Network Dashboard 🚌

A modern, responsive Next.js dashboard for visualizing and analyzing Baku's public transportation network with real-time insights.

## ✨ Features

- **📊 Dashboard**: Overview statistics with beautiful gradient cards
- **🚌 Bus Directory**: Browse and filter all 206 bus routes
- **🗺️ Interactive Map**: Visualize 3,800+ bus stops on Leaflet map
- **📍 Route Explorer**: View detailed route variants and directions
- **📈 Live Insights**: Real-time analytics and network statistics
- **📱 Responsive Design**: Fully mobile-friendly across all devices
- **🎨 Modern UI**: Smooth animations and intuitive navigation

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon)
- **Maps**: React Leaflet
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
dashboard/
├── app/
│   ├── api/              # API routes (buses, stops, routes, stats)
│   ├── buses/            # Buses page
│   ├── map/              # Interactive map
│   ├── routes/           # Routes explorer
│   ├── insights/         # Analytics
│   └── page.tsx          # Dashboard home
├── components/
│   ├── Navigation.tsx    # Sidebar navigation
│   └── MapComponent.tsx  # Leaflet map
└── lib/
    ├── db.ts             # Database connection
    └── types.ts          # TypeScript types
```

## 📄 Pages

- **/** - Dashboard with statistics and quick actions
- **/buses** - All buses with filters (carrier, region, search)
- **/routes** - Route variants with direction filtering
- **/map** - Interactive network map with all stops
- **/insights** - Live analytics and visualizations

## 🌐 Deploying to Vercel

### Quick Deploy

1. **Push to GitHub**

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - **Set root directory to `dashboard`**

3. **Configure Environment**:
   - Add environment variable: `DATABASE_URL`
   - Paste your PostgreSQL connection string

4. **Deploy**! 🎉

### Environment Variables

Required in Vercel:
- `DATABASE_URL`: PostgreSQL connection string

## 📊 API Endpoints

- `GET /api/stats` - Dashboard statistics
- `GET /api/buses` - All buses with details
- `GET /api/stops` - All bus stops
- `GET /api/routes` - All route variants
- `GET /api/routes/[id]/coordinates` - Route coordinates

## 🗄️ Database Schema

Uses `ayna` schema with tables:
- `buses` - Bus route information
- `stops` - Bus stop locations
- `routes` - Route variants
- `route_coordinates` - Geographic points
- `stop_details` - Detailed stop info
- Reference tables: `payment_types`, `regions`, `working_zone_types`

## 🎯 Key Features Breakdown

### Dashboard Home
- Real-time statistics cards
- Quick navigation actions
- Network overview
- Beautiful gradient design

### Buses Page
- Search by number/origin/destination
- Filter by carrier and region
- View route length and duration
- Responsive card grid

### Map Page
- Interactive Leaflet map
- All bus stops visualized
- Transport hub highlighting
- Search and filter controls

### Insights Page
- Average route metrics
- Longest/shortest routes
- Carrier distribution charts
- Regional breakdown
- Service type analysis

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🙏 Acknowledgments

- Data: Ayna Transport API
- Maps: OpenStreetMap
- Built with Next.js & Vercel

---

**Built with ❤️ for Baku's public transportation network**
