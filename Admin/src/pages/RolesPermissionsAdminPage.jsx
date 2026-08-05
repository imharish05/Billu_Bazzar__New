import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Plus, Search, Edit3, Trash2, ChevronDown, ChevronRight, 
  Check, X, RotateCcw, Maximize2, Minimize2, CheckSquare, ShieldAlert, 
  Lock, Save, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

// 9 Standard Collapsible Permission Matrix Sections
const PERMISSION_SECTIONS = [
  {
    id: 'dashboard',
    title: '1. Dashboard',
    modules: [
      { key: 'dashboard', label: 'Dashboard' },
    ]
  },
  {
    id: 'catalog',
    title: '2. Catalog',
    modules: [
      { key: 'products', label: 'Products' },
      { key: 'categories', label: 'Categories' },
      { key: 'brands', label: 'Brands' },
      { key: 'attributes', label: 'Attributes' },
      { key: 'tags', label: 'Tags' },
    ]
  },
  {
    id: 'orders',
    title: '3. Orders',
    modules: [
      { key: 'orders', label: 'Orders' },
      { key: 'returns', label: 'Returns' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'shipping', label: 'Shipping' },
    ]
  },
  {
    id: 'customers',
    title: '4. Customers',
    modules: [
      { key: 'customers', label: 'Customers' },
      { key: 'addresses', label: 'Addresses' },
      { key: 'reviews', label: 'Reviews' },
    ]
  },
  {
    id: 'marketing',
    title: '5. Marketing',
    modules: [
      { key: 'coupons', label: 'Coupons' },
      { key: 'banners', label: 'Banners' },
      { key: 'affiliates', label: 'Affiliates' },
      { key: 'gift_cards', label: 'Gift Cards' },
    ]
  },
  {
    id: 'inventory',
    title: '6. Inventory',
    modules: [
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'stock', label: 'Stock' },
      { key: 'suppliers', label: 'Suppliers' },
    ]
  },
  {
    id: 'vendors',
    title: '7. Vendors',
    modules: [
      { key: 'vendor_accounts', label: 'Vendor Accounts' },
      { key: 'vendor_products', label: 'Vendor Products' },
    ]
  },
  {
    id: 'reports',
    title: '8. Reports',
    modules: [
      { key: 'sales_reports', label: 'Sales Reports' },
      { key: 'customer_reports', label: 'Customer Reports' },
      { key: 'inventory_reports', label: 'Inventory Reports' },
    ]
  },
  {
    id: 'settings',
    title: '9. Settings',
    modules: [
      { key: 'general_settings', label: 'General Settings' },
      { key: 'roles', label: 'Roles' },
      { key: 'permissions', label: 'Permissions' },
      { key: 'security', label: 'Security' },
      { key: 'users', label: 'Users' },
      { key: 'notifications', label: 'Notifications' },
    ]
  }
];

// Helper to construct full CRUD permissions object
const createEmptyPermissions = () => {
  const perm = {};
  PERMISSION_SECTIONS.forEach(sec => {
    sec.modules.forEach(mod => {
      perm[mod.key] = { view: false, create: false, update: false, delete: false };
    });
  });
  return perm;
};

const createFullPermissions = () => {
  const perm = {};
  PERMISSION_SECTIONS.forEach(sec => {
    sec.modules.forEach(mod => {
      perm[mod.key] = { view: true, create: true, update: true, delete: true };
    });
  });
  return perm;
};

// Default Preset Roles
const INITIAL_DEFAULT_ROLES = [
  { id: 1, name: 'Super Admin', isSystem: true, description: 'Full un-lockable administrative access across all store operations', permissions: createFullPermissions() },
  { id: 2, name: 'Admin', isSystem: true, description: 'Complete management of products, orders, customers, and marketing', permissions: createFullPermissions() },
  { id: 3, name: 'Store Manager', isSystem: false, description: 'Day-to-day store management, catalog maintenance, and order fulfillment', permissions: createEmptyPermissions() },
  { id: 4, name: 'Warehouse Manager', isSystem: false, description: 'Inventory stock management, warehouse logistics, and suppliers', permissions: createEmptyPermissions() },
  { id: 5, name: 'Marketing', isSystem: false, description: 'Coupons, promotional banners, affiliate tracking, and gift cards', permissions: createEmptyPermissions() },
  { id: 6, name: 'Customer Support', isSystem: false, description: 'Customer tickets, order status updates, and review moderation', permissions: createEmptyPermissions() },
  { id: 7, name: 'Vendor Manager', isSystem: false, description: 'Vendor accounts onboarding and vendor catalog approval', permissions: createEmptyPermissions() },
  { id: 8, name: 'Delivery Staff', isSystem: false, description: 'Dispatch tracking, shipping manifests, and order status delivery', permissions: createEmptyPermissions() },
  { id: 9, name: 'Accountant', isSystem: false, description: 'Financial statements, sales reports, and customer invoicing', permissions: createEmptyPermissions() },
];

const RolesPermissionsAdminPage = ({ standalone = true }) => {
  const [roles, setRoles] = useState(INITIAL_DEFAULT_ROLES);
  const [selectedRoleName, setSelectedRoleName] = useState('Admin');
  const [rolePermissions, setRolePermissions] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Search & Filter state
  const [roleSearch, setRoleSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');

  // Collapsible Sections State (all open by default)
  const [collapsedSections, setCollapsedSections] = useState({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [cloneRoleId, setCloneRoleId] = useState('');

  // Edit Role Form State
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // Fetch Roles from Backend DB on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles').catch(() => null);
      if (res?.data?.success && Array.isArray(res.data.roles) && res.data.roles.length > 0) {
        const fetchedRoles = res.data.roles.map(r => ({
          id: r.id,
          name: r.name,
          isSystem: r.name === 'Super Admin' || r.name === 'Admin',
          description: r.description || `${r.name} access role`,
          permissions: r.permissions || createFullPermissions()
        }));

        setRoles(fetchedRoles);
        
        // Populate permissions map
        const permMap = {};
        fetchedRoles.forEach(r => {
          permMap[r.name] = r.permissions;
        });
        setRolePermissions(permMap);
      } else {
        // Fallback to presets
        const permMap = {};
        INITIAL_DEFAULT_ROLES.forEach(r => {
          permMap[r.name] = r.permissions;
        });
        setRolePermissions(permMap);
      }
    } catch (err) {
      console.warn('Failed to load roles from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  // Selected Role Object
  const currentRole = useMemo(() => {
    return roles.find(r => r.name === selectedRoleName) || roles[0] || INITIAL_DEFAULT_ROLES[0];
  }, [roles, selectedRoleName]);

  // Current active permissions map for selected role
  const activePermissions = useMemo(() => {
    return rolePermissions[selectedRoleName] || createFullPermissions();
  }, [rolePermissions, selectedRoleName]);

  // Filtered Roles list
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase().trim();
    return roles.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  // Filtered Permission Sections
  const filteredSections = useMemo(() => {
    if (!moduleSearch.trim()) return PERMISSION_SECTIONS;
    const q = moduleSearch.toLowerCase().trim();
    return PERMISSION_SECTIONS.map(sec => ({
      ...sec,
      modules: sec.modules.filter(m => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q))
    })).filter(sec => sec.modules.length > 0);
  }, [moduleSearch]);

  // Handle individual CRUD toggle
  const handleToggleAction = (moduleKey, action) => {
    setRolePermissions(prev => {
      const currentRolePerms = { ...(prev[selectedRoleName] || {}) };
      const modPerm = { ...(currentRolePerms[moduleKey] || { view: false, create: false, update: false, delete: false }) };
      
      modPerm[action] = !modPerm[action];
      
      // Automatic Full Access synchronization
      // If view, create, update, delete are all true -> full access is implicit
      currentRolePerms[moduleKey] = modPerm;

      return { ...prev, [selectedRoleName]: currentRolePerms };
    });
    setDirty(true);
  };

  // Toggle Full Access for a specific module row
  const handleToggleModuleFullAccess = (moduleKey) => {
    const currentModPerm = activePermissions[moduleKey] || { view: false, create: false, update: false, delete: false };
    const isCurrentlyFull = currentModPerm.view && currentModPerm.create && currentModPerm.update && currentModPerm.delete;
    const nextState = !isCurrentlyFull;

    setRolePermissions(prev => {
      const currentRolePerms = { ...(prev[selectedRoleName] || {}) };
      currentRolePerms[moduleKey] = {
        view: nextState,
        create: nextState,
        update: nextState,
        delete: nextState
      };
      return { ...prev, [selectedRoleName]: currentRolePerms };
    });
    setDirty(true);
  };

  // Bulk Actions
  const handleSelectAll = () => {
    const full = createFullPermissions();
    setRolePermissions(prev => ({ ...prev, [selectedRoleName]: full }));
    setDirty(true);
    toast.success(`Granted full CRUD access for all modules to ${selectedRoleName}`);
  };

  const handleClearAll = () => {
    const empty = createEmptyPermissions();
    setRolePermissions(prev => ({ ...prev, [selectedRoleName]: empty }));
    setDirty(true);
    toast.success(`Cleared all permissions for ${selectedRoleName}`);
  };

  const handleGrantFullAccessGlobal = () => {
    handleSelectAll();
  };

  const handleResetPermissions = () => {
    fetchRoles();
    setDirty(false);
    toast.success('Permissions reset to last saved state.');
  };

  const toggleCollapseAll = (collapse) => {
    const map = {};
    PERMISSION_SECTIONS.forEach(s => {
      map[s.id] = collapse;
    });
    setCollapsedSections(map);
  };

  const toggleSection = (secId) => {
    setCollapsedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Save changes to backend DB
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      if (currentRole.id && typeof currentRole.id === 'number') {
        await api.put(`/roles/${currentRole.id}`, {
          permissions: activePermissions,
          description: currentRole.description
        });
      } else {
        await api.post('/roles', {
          name: currentRole.name,
          description: currentRole.description,
          permissions: activePermissions
        });
      }
      setDirty(false);
      toast.success(`Roles & Permissions for "${selectedRoleName}" saved successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Create Role Modal Action
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    try {
      let initialPerms = createEmptyPermissions();
      if (cloneRoleId) {
        const cloned = roles.find(r => String(r.id) === String(cloneRoleId) || r.name === cloneRoleId);
        if (cloned && cloned.permissions) {
          initialPerms = JSON.parse(JSON.stringify(cloned.permissions));
        }
      }

      const res = await api.post('/roles', {
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || `${newRoleName.trim()} role`,
        permissions: initialPerms
      });

      const created = res.data?.role || {
        id: Date.now(),
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        isSystem: false,
        permissions: initialPerms
      };

      setRoles(prev => [...prev, created]);
      setRolePermissions(prev => ({ ...prev, [created.name]: initialPerms }));
      setSelectedRoleName(created.name);

      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setCloneRoleId('');
      toast.success(`New Role "${created.name}" created successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    }
  };

  // Edit Role Action
  const handleOpenEditModal = () => {
    setEditRoleName(currentRole.name);
    setEditRoleDesc(currentRole.description || '');
    setShowEditModal(true);
  };

  const handleSaveEditRole = async (e) => {
    e.preventDefault();
    if (!editRoleName.trim()) return;

    try {
      if (currentRole.id && typeof currentRole.id === 'number') {
        await api.put(`/roles/${currentRole.id}`, {
          name: editRoleName.trim(),
          description: editRoleDesc.trim(),
          permissions: activePermissions
        });
      }

      setRoles(prev => prev.map(r => r.id === currentRole.id ? { ...r, name: editRoleName.trim(), description: editRoleDesc.trim() } : r));
      
      if (editRoleName.trim() !== currentRole.name) {
        setRolePermissions(prev => {
          const next = { ...prev };
          next[editRoleName.trim()] = next[currentRole.name];
          delete next[currentRole.name];
          return next;
        });
        setSelectedRoleName(editRoleName.trim());
      }

      setShowEditModal(false);
      toast.success('Role details updated successfully!');
    } catch (err) {
      toast.error('Failed to update role details');
    }
  };

  // Delete Role Action
  const handleDeleteRole = async () => {
    if (currentRole.isSystem || currentRole.name === 'Super Admin' || currentRole.name === 'Admin') {
      toast.error('Protected System Roles cannot be deleted');
      setShowDeleteModal(false);
      return;
    }

    try {
      if (currentRole.id && typeof currentRole.id === 'number') {
        await api.delete(`/roles/${currentRole.id}`);
      }

      const remaining = roles.filter(r => r.name !== currentRole.name);
      setRoles(remaining);
      setSelectedRoleName(remaining[0]?.name || 'Admin');
      setShowDeleteModal(false);
      toast.success(`Role "${currentRole.name}" deleted successfully.`);
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  const content = (
    <div className="pb-24">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-grey mb-1">
            <span>Settings</span>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Roles & Permissions</span>
          </div>
          <h1 className="font-playfair text-2xl md:text-3xl font-bold text-neutral-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-brand-gold" /> Roles & Permissions
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Role input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
              placeholder="Search roles..."
              className="pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-gold w-44 md:w-56 bg-white shadow-xs"
            />
          </div>

          {/* Grant Full Access Global */}
          <button
            type="button"
            onClick={handleGrantFullAccessGlobal}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" /> Grant Full Access
          </button>

          {/* Add Role Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-gold hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 active:scale-98"
          >
            <Plus className="w-4 h-4" /> Add Role
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT SIDEBAR (ROLES LIST) ── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-gold" /> Roles List ({filteredRoles.length})
              </h3>
            </div>

            {/* Roles List */}
            <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  No roles found matching "{roleSearch}"
                </div>
              ) : (
                filteredRoles.map(r => {
                  const isSelected = r.name === selectedRoleName;
                  return (
                    <button
                      key={r.id || r.name}
                      type="button"
                      onClick={() => setSelectedRoleName(r.name)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex items-start justify-between group ${
                        isSelected
                          ? 'border-l-4 border-brand-gold bg-amber-50/70 font-semibold text-neutral-900 shadow-xs'
                          : 'hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 group-hover:text-brand-gold transition-colors">
                            {r.name}
                          </span>
                          {r.isSystem && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5 font-normal">
                          {r.description || 'Custom staff access role'}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 mt-0.5 transition-transform ${isSelected ? 'text-brand-gold translate-x-0.5' : 'text-neutral-300'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Add New Role Button */}
            <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2 border border-dashed border-neutral-300 hover:border-brand-gold hover:bg-white text-neutral-700 hover:text-brand-gold rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Role
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT CONTENT AREA ── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* ROLE DETAILS CARD */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="font-playfair text-xl font-bold text-neutral-900">{currentRole.name}</h2>
                {currentRole.isSystem && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    System Role
                  </span>
                )}
                {currentRole.name === 'Super Admin' && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{currentRole.description || 'Full operational access and management permissions.'}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="px-3 py-1.5 border border-neutral-200 hover:border-brand-gold text-xs font-semibold rounded-lg text-neutral-700 hover:text-brand-gold transition-colors flex items-center gap-1.5 bg-white shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>

              {!currentRole.isSystem && currentRole.name !== 'Super Admin' && currentRole.name !== 'Admin' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-xs font-semibold rounded-lg text-rose-600 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* PERMISSIONS CARD & BULK CONTROLS */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            {/* Header Controls */}
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={moduleSearch}
                  onChange={e => setModuleSearch(e.target.value)}
                  placeholder="Search module permissions..."
                  className="pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-gold w-full bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-emerald-500 text-neutral-700 hover:text-emerald-700 text-xs font-semibold rounded-md transition-colors shadow-xs"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-rose-400 text-neutral-700 hover:text-rose-600 text-xs font-semibold rounded-md transition-colors shadow-xs"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => toggleCollapseAll(false)}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-md hover:bg-neutral-50 transition-colors shadow-xs flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> Expand All
                </button>
                <button
                  type="button"
                  onClick={() => toggleCollapseAll(true)}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-md hover:bg-neutral-50 transition-colors shadow-xs flex items-center gap-1"
                >
                  <Minimize2 className="w-3 h-3" /> Collapse All
                </button>
                <button
                  type="button"
                  onClick={handleResetPermissions}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-md hover:bg-neutral-50 transition-colors shadow-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* PERMISSION MATRIX TABLE (COLLAPSIBLE SECTIONS) */}
            <div className="divide-y divide-neutral-200">
              {filteredSections.map(section => {
                const isCollapsed = Boolean(collapsedSections[section.id]);

                return (
                  <div key={section.id} className="bg-white">
                    {/* Collapsible Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-5 py-3 bg-neutral-100/70 hover:bg-neutral-100 flex items-center justify-between transition-colors text-left border-b border-neutral-200"
                    >
                      <span className="font-bold text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-brand-gold" />}
                        {section.title}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {section.modules.length} modules
                      </span>
                    </button>

                    {/* Section Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-5 w-1/3">Module Name</th>
                              <th className="py-2.5 px-3 text-center text-emerald-700">View (Read)</th>
                              <th className="py-2.5 px-3 text-center text-blue-700">Create</th>
                              <th className="py-2.5 px-3 text-center text-amber-700">Update</th>
                              <th className="py-2.5 px-3 text-center text-rose-700">Delete</th>
                              <th className="py-2.5 px-5 text-center text-brand-gold">Full Access</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {section.modules.map(mod => {
                              const modPerm = activePermissions[mod.key] || { view: false, create: false, update: false, delete: false };
                              const isFull = Boolean(modPerm.view && modPerm.create && modPerm.update && modPerm.delete);

                              return (
                                <tr key={mod.key} className="hover:bg-amber-50/20 transition-colors">
                                  <td className="py-3 px-5 font-semibold text-neutral-900">
                                    {mod.label}
                                  </td>
                                  {['view', 'create', 'update', 'delete'].map(action => (
                                    <td key={action} className="py-3 px-3 text-center">
                                      <label className="inline-flex items-center justify-center cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(modPerm[action])}
                                          onChange={() => handleToggleAction(mod.key, action)}
                                          className="w-4 h-4 accent-brand-gold rounded border-neutral-300 cursor-pointer focus:ring-1 focus:ring-brand-gold"
                                        />
                                      </label>
                                    </td>
                                  ))}
                                  <td className="py-3 px-5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleModuleFullAccess(mod.key)}
                                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider transition-all ${
                                        isFull
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                      }`}
                                    >
                                      {isFull ? 'Full Access ✓' : 'Select All'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 shadow-xl flex items-center justify-between px-6 md:px-10">
        <div className="text-xs text-neutral-500 font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
          Editing Role: <span className="font-bold text-neutral-900">{selectedRoleName}</span>
          {dirty && <span className="text-amber-600 font-semibold ml-2">(Unsaved Changes)</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetPermissions}
            className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveChanges}
            className="bg-brand-gold hover:bg-amber-600 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2 active:scale-98"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── CREATE NEW ROLE MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="font-playfair text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-gold" /> Create New Role
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="e.g. Regional Manager"
                    className="w-full border border-neutral-300 p-2.5 text-xs rounded-lg focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="Describe the operational scope of this role..."
                    className="w-full border border-neutral-300 p-2.5 text-xs rounded-lg focus:outline-none focus:border-brand-gold resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Clone Existing Role Permissions (Optional)</label>
                  <select
                    value={cloneRoleId}
                    onChange={e => setCloneRoleId(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs rounded-lg focus:outline-none focus:border-brand-gold bg-white"
                  >
                    <option value="">-- Do Not Clone (Start Clean) --</option>
                    {roles.map(r => (
                      <option key={r.id || r.name} value={r.name}>Clone permissions from {r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-gold hover:bg-amber-600 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                  >
                    Create Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT ROLE MODAL ── */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="font-playfair text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-gold" /> Edit Role Details
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditRole} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={editRoleName}
                    onChange={e => setEditRoleName(e.target.value)}
                    disabled={currentRole.isSystem}
                    className={`w-full border border-neutral-300 p-2.5 text-xs rounded-lg focus:outline-none focus:border-brand-gold ${currentRole.isSystem ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editRoleDesc}
                    onChange={e => setEditRoleDesc(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs rounded-lg focus:outline-none focus:border-brand-gold resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-gold text-white text-xs font-bold px-5 py-2 rounded-lg"
                  >
                    Save Details
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-playfair text-lg font-bold text-neutral-900 mb-2">Delete Role</h3>
              <p className="text-xs text-neutral-600 mb-6">
                Are you sure you want to delete <span className="font-bold text-neutral-900">"{currentRole.name}"</span>?
                This action cannot be undone.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return standalone ? <AdminLayout title="Roles & Permissions">{content}</AdminLayout> : content;
};

export default RolesPermissionsAdminPage;
