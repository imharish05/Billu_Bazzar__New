import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Upload, Eye, Sparkles, Target, Settings, HelpCircle, BarChart3, List, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'hero-story', label: 'Hero & Story', icon: Sparkles },
  { id: 'stats-pillars', label: 'Stats & Pillars', icon: Target },
  { id: 'philosophy-support', label: 'Philosophy & Support', icon: HelpCircle }
];

const SiteSettingsAdminPage = () => {
  const [activeTab, setActiveTab] = useState('hero-story');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings Form State
  const [settings, setSettings] = useState({
    hero: { subtitle: '', titleMain: '', titleGold: '', description: '' },
    story: {
      subtitle: '', titleMain: '', titleSub: '', description1: '', description2: '',
      feature1Title: '', feature1Desc: '', feature2Title: '', feature2Desc: '',
      qualityOathTitle: '', qualityOathDesc: '', imageUrl: ''
    },
    stats: [
      { value: '', label: '', sub: '', iconName: 'Users' },
      { value: '', label: '', sub: '', iconName: 'Instagram' },
      { value: '', label: '', sub: '', iconName: 'Package' },
      { value: '', label: '', sub: '', iconName: 'Award' }
    ],
    values: [
      { title: '', accent: '', description: '' },
      { title: '', accent: '', description: '' },
      { title: '', accent: '', description: '' }
    ],
    philosophy: { subtitle: '', title: '', description: '' },
    concierge: { subtitle: '', title: '', description: '' },
    marqueeWords: []
  });

  const [marqueeInput, setMarqueeInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Site Settings from backend
  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/site-settings/about');
      if (res.data && res.data.success) {
        const data = res.data.data;
        setSettings(data);
        setMarqueeInput(data.marqueeWords ? data.marqueeWords.join(', ') : '');
        setImagePreview(data.story?.imageUrl || '');
      }
    } catch (err) {
      toast.error('Failed to load site settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleImageChange = (eOrFile) => {
    const file = eOrFile instanceof File ? eOrFile : eOrFile.target?.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Split and clean marquee words
      const marqueeWords = marqueeInput
        .split(',')
        .map(w => w.trim().toUpperCase())
        .filter(w => w.length > 0);

      const updatedSettings = {
        ...settings,
        marqueeWords
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(updatedSettings));
      if (imageFile) {
        fd.append('image', imageFile);
      }

      const res = await api.post('/site-settings/about', fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data && res.data.success) {
        toast.success('Site settings saved successfully');
        // Refresh with actual server-saved paths
        setSettings(res.data.data);
        setImagePreview(res.data.data.story?.imageUrl || '');
        setImageFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Site Settings">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-brand-gold" size={32} />
            <span className="text-sm text-brand-grey">Loading settings...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Site Settings">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-brand-light" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === id
                  ? 'border-brand-gold text-brand-gold bg-amber-50/30'
                  : 'border-transparent text-brand-grey hover:text-brand-text hover:bg-neutral-50/50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Hero & Story */}
            {activeTab === 'hero-story' && (
              <motion.div
                key="hero-story"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Hero Section */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Hero Section Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Hero Subtitle (e.g. Est. 2019)</label>
                      <input
                        type="text"
                        value={settings.hero.subtitle}
                        onChange={(e) => setSettings({
                          ...settings,
                          hero: { ...settings.hero, subtitle: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Est. 2019"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                      <div>
                        <label className="block text-xs font-semibold text-brand-grey mb-1.5">Hero Title (Main Text - White)</label>
                        <input
                          type="text"
                          value={settings.hero.titleMain}
                          onChange={(e) => setSettings({
                            ...settings,
                            hero: { ...settings.hero, titleMain: e.target.value }
                          })}
                          className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                          placeholder="Your Premium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-grey mb-1.5">Hero Title (Gold Highlighted Text)</label>
                        <input
                          type="text"
                          value={settings.hero.titleGold}
                          onChange={(e) => setSettings({
                            ...settings,
                            hero: { ...settings.hero, titleGold: e.target.value }
                          })}
                          className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                          placeholder="Lifestyle Destination"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Hero Description</label>
                      <textarea
                        rows={3}
                        value={settings.hero.description}
                        onChange={(e) => setSettings({
                          ...settings,
                          hero: { ...settings.hero, description: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Brief intro text explaining the store..."
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Story Section */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Our Legacy / Story Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Story Subtitle (e.g. Our Legacy)</label>
                      <input
                        type="text"
                        value={settings.story.subtitle}
                        onChange={(e) => setSettings({
                          ...settings,
                          story: { ...settings.story, subtitle: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                      <div>
                        <label className="block text-xs font-semibold text-brand-grey mb-1.5">Story Title (Line 1 - Main)</label>
                        <input
                          type="text"
                          value={settings.story.titleMain}
                          onChange={(e) => setSettings({
                            ...settings,
                            story: { ...settings.story, titleMain: e.target.value }
                          })}
                          className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                          placeholder="Curation For The"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-grey mb-1.5">Story Title (Line 2 - Sub)</label>
                        <input
                          type="text"
                          value={settings.story.titleSub}
                          onChange={(e) => setSettings({
                            ...settings,
                            story: { ...settings.story, titleSub: e.target.value }
                          })}
                          className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                          placeholder="Modern Connoisseur"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Story Description Paragraph 1</label>
                      <textarea
                        rows={3}
                        value={settings.story.description1}
                        onChange={(e) => setSettings({
                          ...settings,
                          story: { ...settings.story, description1: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Story Description Paragraph 2</label>
                      <textarea
                        rows={3}
                        value={settings.story.description2}
                        onChange={(e) => setSettings({
                          ...settings,
                          story: { ...settings.story, description2: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold transition-colors"
                      />
                    </div>

                    {/* Features in Story */}
                    <div className="border border-brand-light rounded-xl p-4 md:col-span-2 bg-neutral-50/50 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Key Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[11px] font-semibold text-brand-grey">Feature 1: Title</label>
                          <input
                            type="text"
                            value={settings.story.feature1Title}
                            onChange={(e) => setSettings({
                              ...settings,
                              story: { ...settings.story, feature1Title: e.target.value }
                            })}
                            className="w-full border border-brand-light bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                          />
                          <label className="block text-[11px] font-semibold text-brand-grey">Feature 1: Description</label>
                          <textarea
                            rows={2}
                            value={settings.story.feature1Desc}
                            onChange={(e) => setSettings({
                              ...settings,
                              story: { ...settings.story, feature1Desc: e.target.value }
                            })}
                            className="w-full border border-brand-light bg-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[11px] font-semibold text-brand-grey">Feature 2: Title</label>
                          <input
                            type="text"
                            value={settings.story.feature2Title}
                            onChange={(e) => setSettings({
                              ...settings,
                              story: { ...settings.story, feature2Title: e.target.value }
                            })}
                            className="w-full border border-brand-light bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                          />
                          <label className="block text-[11px] font-semibold text-brand-grey">Feature 2: Description</label>
                          <textarea
                            rows={2}
                            value={settings.story.feature2Desc}
                            onChange={(e) => setSettings({
                              ...settings,
                              story: { ...settings.story, feature2Desc: e.target.value }
                            })}
                            className="w-full border border-brand-light bg-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Story Image Section */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-brand-light">
                      <div className="md:col-span-1 space-y-2">
                        <label className="block text-xs font-semibold text-brand-grey">Story Banner Image</label>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center text-center h-48 cursor-pointer ${
                            isDragging
                              ? 'border-brand-gold bg-amber-50/20 scale-98'
                              : 'border-brand-light hover:border-brand-gold hover:bg-amber-50/10'
                          }`}
                        >
                          <Upload className="w-8 h-8 text-brand-grey mb-2" />
                          <span className="text-xs font-medium text-brand-text">Upload Image</span>
                          <span className="text-[10px] text-brand-grey mt-1">PNG, JPG or WebP</span>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-brand-grey mb-1.5">Live Preview</label>
                        <div className="border border-brand-light rounded-xl h-48 overflow-hidden bg-neutral-50 flex items-center justify-center relative group">
                          {imagePreview ? (
                            <>
                              <img
                                src={imagePreview.startsWith('data:') || imagePreview.startsWith('http://') || imagePreview.startsWith('https://')
                                  ? imagePreview
                                  : `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${imagePreview.startsWith('/') ? '' : '/'}${imagePreview}`}
                                alt="Story Banner Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800';
                                }}
                              />
                              {imageFile && (
                                <span className="absolute top-2 right-2 bg-brand-gold text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                                  New Upload
                                </span>
                              )}
                            </>
                          ) : (
                            <img
                              src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800"
                              alt="Story Banner Fallback"
                              className="w-full h-full object-cover opacity-80"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quality Oath Section */}
                    <div className="border border-brand-light rounded-xl p-4 md:col-span-2 bg-neutral-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 border-b border-brand-light pb-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Story Quality Oath (Badge Overlay)</h4>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-brand-grey">Oath Badge Title</label>
                        <input
                          type="text"
                          value={settings.story.qualityOathTitle}
                          onChange={(e) => setSettings({
                            ...settings,
                            story: { ...settings.story, qualityOathTitle: e.target.value }
                          })}
                          className="w-full border border-brand-light bg-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                          placeholder="Our Quality Oath"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-brand-grey">Oath Description</label>
                        <textarea
                          rows={2}
                          value={settings.story.qualityOathDesc}
                          onChange={(e) => setSettings({
                            ...settings,
                            story: { ...settings.story, qualityOathDesc: e.target.value }
                          })}
                          className="w-full border border-brand-light bg-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          placeholder="Describe the guarantee or inspection details..."
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: Stats & Pillars */}
            {activeTab === 'stats-pillars' && (
              <motion.div
                key="stats-pillars"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Stats Counter Cards */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">By The Numbers - Page Stats Counter</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {settings.stats.map((stat, idx) => (
                      <div key={idx} className="border border-brand-light rounded-xl p-4 bg-neutral-50/50 space-y-3">
                        <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block border-b border-brand-light/75 pb-1">Stat Card #{idx + 1}</span>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Value (e.g. 50000+)</label>
                          <input
                            type="text"
                            value={stat.value}
                            onChange={(e) => {
                              const newStats = [...settings.stats];
                              newStats[idx].value = e.target.value;
                              setSettings({ ...settings, stats: newStats });
                            }}
                            className="w-full border border-brand-light bg-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Label (e.g. Happy Patrons)</label>
                          <input
                            type="text"
                            value={stat.label}
                            onChange={(e) => {
                              const newStats = [...settings.stats];
                              newStats[idx].label = e.target.value;
                              setSettings({ ...settings, stats: newStats });
                            }}
                            className="w-full border border-brand-light bg-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Subtitle (e.g. Verified customer counts)</label>
                          <input
                            type="text"
                            value={stat.sub}
                            onChange={(e) => {
                              const newStats = [...settings.stats];
                              newStats[idx].sub = e.target.value;
                              setSettings({ ...settings, stats: newStats });
                            }}
                            className="w-full border border-brand-light bg-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pillars of Excellence (Values) */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Pillars of Excellence (Values Cards)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {settings.values.map((val, idx) => (
                      <div key={idx} className="border border-brand-light rounded-xl p-4 bg-neutral-50/50 space-y-3">
                        <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block border-b border-brand-light pb-1">Value Card #{idx + 1}</span>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Pillar Title (e.g. Our Vision)</label>
                          <input
                            type="text"
                            value={val.title}
                            onChange={(e) => {
                              const newVals = [...settings.values];
                              newVals[idx].title = e.target.value;
                              setSettings({ ...settings, values: newVals });
                            }}
                            className="w-full border border-brand-light bg-white px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Accent Title (e.g. Curated Curation)</label>
                          <input
                            type="text"
                            value={val.accent}
                            onChange={(e) => {
                              const newVals = [...settings.values];
                              newVals[idx].accent = e.target.value;
                              setSettings({ ...settings, values: newVals });
                            }}
                            className="w-full border border-brand-light bg-white px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-grey mb-1">Description Paragraph</label>
                          <textarea
                            rows={4}
                            value={val.description}
                            onChange={(e) => {
                              const newVals = [...settings.values];
                              newVals[idx].description = e.target.value;
                              setSettings({ ...settings, values: newVals });
                            }}
                            className="w-full border border-brand-light bg-white px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marquee Word Scroller */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Marquee Infinite Word Scroller</h3>
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5">Marquee Words (Comma separated)</label>
                    <input
                      type="text"
                      value={marqueeInput}
                      onChange={(e) => setMarqueeInput(e.target.value)}
                      className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      placeholder="ELECTRONICS, APPAREL, HOME, BEAUTY, SPORTS"
                    />
                    <p className="text-[10px] text-brand-grey mt-1.5">Separate words using commas. They will automatically be capitalized and scrolling on the client page.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: Philosophy & Support */}
            {activeTab === 'philosophy-support' && (
              <motion.div
                key="philosophy-support"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Philosophy Settings */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Our Philosophy Header Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Philosophy Subtitle (e.g. Our Philosophy)</label>
                      <input
                        type="text"
                        value={settings.philosophy.subtitle}
                        onChange={(e) => setSettings({
                          ...settings,
                          philosophy: { ...settings.philosophy, subtitle: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Philosophy Title</label>
                      <input
                        type="text"
                        value={settings.philosophy.title}
                        onChange={(e) => setSettings({
                          ...settings,
                          philosophy: { ...settings.philosophy, title: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Philosophy Description Paragraph</label>
                      <textarea
                        rows={2}
                        value={settings.philosophy.description}
                        onChange={(e) => setSettings({
                          ...settings,
                          philosophy: { ...settings.philosophy, description: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>
                </div>

                {/* Private Concierge Support CTA Settings */}
                <div className="bg-white rounded-xl border border-brand-light shadow-sm p-6">
                  <h3 className="text-base font-playfair font-bold text-brand-text mb-4 border-b border-brand-light pb-2">Support & Concierge Section Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Concierge Subtitle (e.g. Need Assistance?)</label>
                      <input
                        type="text"
                        value={settings.concierge.subtitle}
                        onChange={(e) => setSettings({
                          ...settings,
                          concierge: { ...settings.concierge, subtitle: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Concierge Title</label>
                      <input
                        type="text"
                        value={settings.concierge.title}
                        onChange={(e) => setSettings({
                          ...settings,
                          concierge: { ...settings.concierge, title: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-brand-grey mb-1.5">Concierge Description Text</label>
                      <textarea
                        rows={3}
                        value={settings.concierge.description}
                        onChange={(e) => setSettings({
                          ...settings,
                          concierge: { ...settings.concierge, description: e.target.value }
                        })}
                        className="w-full border border-brand-light px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Footer */}
          <div className="bg-white rounded-xl border border-brand-light p-4 shadow-sm flex items-center justify-end gap-3 sticky bottom-4 z-10">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold"
              id="site-settings-save-btn"
            >
              {saving ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Site Settings
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </AdminLayout>
  );
};

export default SiteSettingsAdminPage;
