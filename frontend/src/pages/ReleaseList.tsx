import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReleaseCard } from '@/components/release/ReleaseCard';
import { useReleases, useProducts } from '@/hooks';
import type { ReleaseStatus } from '@/types';
import { Plus, Search } from 'lucide-react';

export function ReleaseList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | ''>('');
  const [productFilter, setProductFilter] = useState<number | ''>('');

  const { data: releases, isLoading } = useReleases({
    status: statusFilter || undefined,
    product_id: productFilter || undefined,
  });
  const { data: products } = useProducts();

  const filteredReleases = releases?.filter((release) =>
    release.name.toLowerCase().includes(search.toLowerCase()) ||
    release.version.toLowerCase().includes(search.toLowerCase())
  );

  const statusOptions: { value: ReleaseStatus | ''; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'released', label: 'Released' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Releases</h1>
        <Link to="/releases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Release
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search releases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReleaseStatus | '')}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value ? Number(e.target.value) : '')}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Products</option>
          {products?.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {/* Release Grid */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading releases...</div>
      ) : filteredReleases && filteredReleases.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReleases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12">
          No releases found
        </div>
      )}
    </div>
  );
}
