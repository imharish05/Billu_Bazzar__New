import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit3, Trash2, Save, RefreshCw
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import AccessDeniedView from '../components/AccessDeniedView';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

// 9 Comprehensive Permission Section Cards for the Grid
// 8 Simplified Permission Section Cards for System-Wide Access Control
const PERMISSION_GROUPS = [
  {
    id: 'categories_hierarchy',
    title: 'Categories & Structure',
    items: [
      { key: 'view_categories', label: 'View Categories (Root, Parent & Child)' },
      { key: 'add_category', label: 'Add & Edit Categories' },
      { key: 'delete_category', label: 'Delete Categories' },
    ]
  },
  {
    id: 'products_catalog',
    title: 'Products & Catalog',
    items: [
      { key: 'view_products', label: 'View Products & Variants' },
      { key: 'add_product', label: 'Add & Edit Products & Variants' },
      { key: 'delete_product', label: 'Delete Products & Variants' },
    ]
  },
  {
    id: 'orders_carts',
    title: 'Orders & Carts',
    items: [
      { key: 'view_orders', label: 'View Orders & Abandoned Carts' },
      { key: 'update_orders', label: 'Update Orders & Process Status' },
      { key: 'cancel_orders', label: 'Cancel Orders & Clear Carts' },
    ]
  },
  {
    id: 'marketing_promotions',
    title: 'Marketing & Promotions',
    items: [
      { key: 'view_marketing', label: 'View Marketing & Promotions' },
      { key: 'manage_marketing', label: 'Manage Coupons, Banners & Loyalty' },
    ]
  },
  {
    id: 'operations_logistics',
    title: 'Operations & Logistics',
    items: [
      { key: 'view_operations', label: 'View Vendors, Warehouses & Delivery' },
      { key: 'manage_operations', label: 'Manage Operations & Stock Alerts' },
    ]
  },
  {
    id: 'customers_enquiries',
    title: 'Customers & Support',
    items: [
      { key: 'view_customers', label: 'View Customers & Enquiries' },
      { key: 'manage_customers', label: 'Manage Customer Accounts & Support' },
    ]
  },
  {
    id: 'finance_reports',
    title: 'Finance & Analytics',
    items: [
      { key: 'view_finance', label: 'View Payments & Sales Reports' },
      { key: 'manage_finance', label: 'Manage Refunds & Export Data' },
    ]
  },
  {
    id: 'settings_access',
    title: 'System & Access Settings',
    items: [
      { key: 'view_settings', label: 'View Settings & Admin Accounts' },
      { key: 'manage_settings', label: 'Manage System Settings & Roles' },
    ]
  }
];

const RolesPermissionsAdminPage = () => {
  // Navigation state: 'table' or 'form'
  const [viewMode, setViewMode] = useState('table');

  // Roles state
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Table Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Form State (for Add / Edit Role)
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      if (res?.data?.success && Array.isArray(res.data.roles)) {
        const fetchedRoles = res.data.roles.map(r => {
          let parsedPerms = r.permissions;
          if (typeof parsedPerms === 'string') {
            try { parsedPerms = JSON.parse(parsedPerms); } catch (e) { parsedPerms = {}; }
          }
          const roleDisplayName = (r.name && r.name.trim()) ? r.name.trim() : ((r.role_name && r.role_name.trim()) ? r.role_name.trim() : ((r.roleName && r.roleName.trim()) ? r.roleName.trim() : `Role #${r.id}`));
          return {
            id: r.id,
            name: roleDisplayName,
            permissions: parsedPerms || {},
            isSystem: r.name === 'Super Admin' || r.name === 'Admin'
          };
        });
        setRoles(fetchedRoles);
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.warn('Failed to fetch roles:', err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Roles for Table View
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    return roles.filter(r => (r.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [roles, searchQuery]);

  // Paginated Roles
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRoles.slice(start, start + rowsPerPage);
  }, [filteredRoles, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredRoles.length / rowsPerPage) || 1;

  // Open Form for Adding New Role
  const handleOpenAddForm = () => {
    setEditingRoleId(null);
    setRoleName('');
    setPermissions({});
    setViewMode('form');
  };

  // Open Form for Editing Role
  const handleOpenEditForm = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name || '');
    setPermissions(role.permissions || {});
    setViewMode('form');
  };

  // Close Form and return to Table view
  const handleCloseForm = () => {
    setViewMode('table');
  };

  // Toggle individual permission checkbox
  const handleToggleItem = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle all permissions in a card group
  const handleToggleGroupAll = (group) => {
    const allKeys = group.items.map(i => i.key);
    const isAllChecked = allKeys.every(k => permissions[k]);

    setPermissions(prev => {
      const next = { ...prev };
      allKeys.forEach(k => {
        next[k] = !isAllChecked;
      });
      return next;
    });
  };

  // Toggle "Select All Permissions" across all groups
  const handleToggleAllGrid = () => {
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));
    const isAllChecked = allKeys.every(k => permissions[k]);

    const next = {};
    allKeys.forEach(k => {
      next[k] = !isAllChecked;
    });
    setPermissions(next);
  };

  const isGlobalAllChecked = useMemo(() => {
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));
    return allKeys.length > 0 && allKeys.every(k => permissions[k]);
  }, [permissions]);

  // Save Role Submit
  const handleSaveRole = async (e) => {
    e.preventDefault();
    const trimmedName = roleName.trim();
    if (!trimmedName) {
      toast.error('Please enter a role name');
      return;
    }

    setSaving(true);
    try {
      if (editingRoleId) {
        // Edit existing role
        const res = await api.put(`/roles/${editingRoleId}`, {
          name: trimmedName,
          permissions
        });
        if (res.data.success) {
          toast.success(`Role "${trimmedName}" updated successfully!`);
          await fetchRoles();
          setViewMode('table');
        }
      } else {
        // Create new role
        const res = await api.post('/roles', {
          name: trimmedName,
          permissions
        });
        if (res.data.success) {
          toast.success(`Role "${trimmedName}" created successfully!`);
          await fetchRoles();
          setViewMode('table');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  // Delete Role
  const handleDeleteRoleConfirm = async () => {
    if (!deletingRoleId) return;
    try {
      const res = await api.delete(`/roles/${deletingRoleId}`);
      if (res.data.success) {
        toast.success('Role deleted successfully');
        setShowDeleteModal(false);
        setDeletingRoleId(null);
        await fetchRoles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  // Count granted permissions for table badge
  const getPermissionsBadge = (roleObj) => {
    if (roleObj.name === 'Super Admin' || roleObj.permissions?.all) {
      return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">All (*)</span>;
    }
    let count = 0;
    const countPerms = (obj) => {
      if (typeof obj === 'boolean') {
        if (obj) count++;
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(val => countPerms(val));
      }
    };
    countPerms(roleObj.permissions || {});

    if (count === 0) {
      return <span className="bg-neutral-100 text-neutral-500 text-[11px] font-medium px-3 py-1 rounded-full">0 Permissions</span>;
    }
    return <span className="bg-blue-100 text-blue-800 text-[11px] font-semibold px-3 py-1 rounded-full">{count} Permissions</span>;
  };

  const { admin: loggedAdmin } = useSelector(s => s.auth);
  const canManageRoles = checkPermission(loggedAdmin, 'manage_roles');

  if (loggedAdmin && !canManageRoles) {
    return (
      <AdminLayout title="Access Denied">
        <AccessDeniedView path="/roles" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Roles & Permissions">
      {/* Top Main Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Roles & Permissions</h1>
      </div>

      {/* VIEW MODE 1: ROLES TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          {/* Card Header & Add Role Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-bold text-neutral-900">Roles & Permissions</h2>
            {canManageRoles && (
              <button
                onClick={handleOpenAddForm}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={15} /> Add Role
              </button>
            )}
          </div>

          {/* Search & Rows Per Page Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 text-neutral-800 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500 justify-end">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          {/* Roles Table */}
          <div className="overflow-x-auto border border-neutral-200 rounded-2xl mb-4">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3.5 px-4 w-16">ID</th>
                  <th className="py-3.5 px-4">ROLE NAME</th>
                  <th className="py-3.5 px-4">PERMISSIONS GRANTED</th>
                  {canManageRoles && <th className="py-3.5 px-4 text-right">ACTIONS</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={canManageRoles ? 4 : 3} className="py-12 text-center text-xs text-neutral-400">
                      <RefreshCw size={18} className="animate-spin text-blue-600 mx-auto mb-2" />
                      Loading roles...
                    </td>
                  </tr>
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={canManageRoles ? 4 : 3} className="py-12 text-center text-xs text-neutral-400">
                      No roles found.
                    </td>
                  </tr>
                ) : paginatedRoles.map((r, index) => (
                  <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-4 px-4 font-semibold text-neutral-500">
                      {r.id || index + 1}
                    </td>

                    <td className="py-4 px-4 font-bold text-neutral-900">
                      {r.name || r.role_name || r.roleName || `Role #${r.id || index + 1}`}
                    </td>

                    <td className="py-4 px-4">
                      {getPermissionsBadge(r)}
                    </td>

                    {canManageRoles && (
                      <td className="py-4 px-4 text-right">
                        {r.name === 'Super Admin' ? (
                          <span className="text-xs text-neutral-400 italic font-medium">System Default</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditForm(r)}
                              className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Role & Permissions"
                            >
                              <Edit3 size={15} />
                            </button>
                            {!r.isSystem && (
                              <button
                                onClick={() => { setDeletingRoleId(r.id); setShowDeleteModal(true); }}
                                className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Role"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2">
            <div>
              Showing {filteredRoles.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, filteredRoles.length)} of {filteredRoles.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
              >
                Prev
              </button>
              <span className="w-8 h-8 rounded-lg bg-neutral-950 text-white font-bold flex items-center justify-center">
                {currentPage}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ROLE EDIT / ADD FORM VIEW */}
      {viewMode === 'form' && (
        <form onSubmit={handleSaveRole} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          {/* Card Header & Close Button */}
          <div className="flex items-center justify-between pb-6 border-b border-neutral-100 mb-6">
            <h2 className="text-base font-bold text-neutral-900">Roles & Permissions</h2>
            <button
              type="button"
              onClick={handleCloseForm}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Top Form Header with Icon */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow-xs shrink-0">
              R
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {editingRoleId ? 'Edit Role' : 'Add New Role'}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Configure role name and access permissions</p>
            </div>
          </div>

          {/* Role Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Role Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sales Manager"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              className="w-full border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:border-blue-600 focus:outline-none bg-white transition-colors"
            />
          </div>

          {/* Permissions Grid Card */}
          <div className="bg-neutral-50/60 border border-neutral-200/80 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 mb-6">
              <span className="font-bold text-xs text-neutral-900">Permissions Grid</span>
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline">
                <input
                  type="checkbox"
                  checked={isGlobalAllChecked}
                  onChange={handleToggleAllGrid}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                Select All Permissions
              </label>
            </div>

            {/* 3-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PERMISSION_GROUPS.map(group => {
                const groupKeys = group.items.map(i => i.key);
                const isGroupAll = groupKeys.length > 0 && groupKeys.every(k => permissions[k]);

                return (
                  <div key={group.id} className="bg-white border border-neutral-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                    <div>
                      {/* Card Group Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                        <span className="font-bold text-xs text-neutral-900">{group.title}</span>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 cursor-pointer hover:text-neutral-900">
                          <input
                            type="checkbox"
                            checked={isGroupAll}
                            onChange={() => handleToggleGroupAll(group)}
                            className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                          />
                          All
                        </label>
                      </div>

                      {/* Checkboxes List for Module Actions */}
                      <div className="space-y-2.5">
                        {group.items.map(item => (
                          <label key={item.key} className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer hover:text-neutral-950">
                            <input
                              type="checkbox"
                              checked={!!permissions[item.key]}
                              onChange={() => handleToggleItem(item.key)}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save Role & Permissions'}
            </button>
          </div>
        </form>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-neutral-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Delete Role?</h3>
              <p className="text-xs text-neutral-500 mt-2">
                Are you sure you want to delete this custom role? All admin users assigned to this role will also be deleted.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRoleConfirm}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default RolesPermissionsAdminPage;
