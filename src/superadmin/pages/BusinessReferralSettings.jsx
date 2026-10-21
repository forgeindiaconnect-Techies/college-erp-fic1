import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, ShieldCheck, Briefcase, Building, Award, Plus, Search,
  Sliders, RefreshCw, CheckCircle2, AlertCircle, Edit, Trash2, Check,
  X, ExternalLink, ShieldAlert, ArrowLeft, Eye, EyeOff, Save, Layers,
  ChevronRight, Sparkles, Building2, User, FileText, CheckCheck, Info,
  SlidersHorizontal, History, Scale, Users2, Shield, Calendar, Tag, CheckSquare,
  ArrowUp, ArrowDown, AlignLeft, CircleDot, Hash, Phone, Mail, Type,
  ChevronUp, ChevronDown, ShieldOff, Send, Lock
} from 'lucide-react';
import {
  getAllReferralFormConfigs,
  updateReferralFormConfig,
  addReferralPartner,
  toggleReferralPartner,
  addReferralProduct,
  toggleReferralProduct,
  resetReferralFormConfig,
  getIncentiveRules,
  createIncentiveRule,
  updateIncentiveRule,
  deleteIncentiveRule,
  getReferralConfigHistory,
  updateReferralFormFields,
  updateReferralPolicy,
  publishReferralForm,
  unpublishReferralForm,
  saveReferralFormDraft
} from '../../api';
import FormBuilderPreviewModal from '../../components/referrals/FormBuilderPreviewModal';
import './BusinessReferralSettings.css';
import '../../pages/admin/UserManagementCommon.css';

export default function BusinessReferralSettings() {
  const navigate = useNavigate();
  const location = useLocation();

  // 9 Tabs:
  // 'credit-card' | 'insurance' | 'job-referral' | 'account-opening' | 'partners' | 'fields' | 'incentives' | 'rules' | 'history'
  const [activeTab, setActiveTab] = useState('credit-card');

  // Configuration States
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info' | 'warning', message: '' }

  // Incentive Rules State
  const [incentiveRules, setIncentiveRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Configuration History State
  const [auditHistory, setAuditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('All');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState('All');
  const [fieldCategoryFilter, setFieldCategoryFilter] = useState('Credit Card');

  // Modals State
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', code: '', category: '', website: '', contactEmail: '' });

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    partnerId: '',
    name: '',
    productCategory: '',
    eligibilityConditions: '',
    requiredDocuments: '',
    annualFee: '',
    turnaroundTime: ''
  });

  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    category: 'Credit Card',
    partnerName: 'All',
    productOrRole: 'All',
    milestone: 'Physical card dispatch & activation confirmation',
    amount: 1000,
    eligibilityConditions: 'Applicant meets minimum partner bank criteria.',
    approvalStatus: 'Approved',
    isActive: true,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: ''
  });

  const [categorySubView, setCategorySubView] = useState('builder'); // 'builder' | 'partners' | 'policy'
  const [stepFilter, setStepFilter] = useState('all'); // 'all' | '1' | '2'
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    fieldKey: '',
    label: '',
    description: '',
    step: 1,
    fieldType: 'text',
    isRequired: false,
    isVisible: true,
    placeholder: '',
    helpText: '',
    optionsString: '',
    validationRule: 'none',
    errorMessage: ''
  });

  const [policyForm, setPolicyForm] = useState({
    consentText: '',
    requireConsent: true,
    enableDuplicateCheck: true,
    duplicateCheckDays: 90,
    maxSubmissionsPerUser: 10
  });

  // Category mapping
  const categoryKeys = {
    'credit-card': 'Credit Card',
    'insurance': 'Insurance',
    'job-referral': 'Job',
    'account-opening': 'Bank Account'
  };

  const currentCategoryName = categoryKeys[activeTab] || 'Credit Card';
  const currentConfig = configs[currentCategoryName] || null;

  // Helper: Generates a clean 2 to 3 letter monogram for the avatar
  const getPartnerMonogram = (partner) => {
    if (!partner) return 'FIC';
    const code = (partner.code || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    if (code && code.length <= 4) return code.toUpperCase();
    if (code && code.length > 4) return code.slice(0, 3).toUpperCase();
    const parts = (partner.name || '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (partner.name || 'PT').slice(0, 3).toUpperCase();
  };

  // Helper: Get brand avatar styling
  const getPartnerAvatarStyle = (partner, category) => {
    const name = (partner?.name || '').toLowerCase();
    if (name.includes('hdfc')) return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    if (name.includes('icici')) return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    if (name.includes('sbi') || name.includes('state bank')) return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    if (name.includes('axis')) return { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' };
    if (name.includes('star')) return { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
    if (name.includes('tcs') || name.includes('tata')) return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    if (name.includes('infosys')) return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    return { bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
  };

  // Load Configurations
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllReferralFormConfigs();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const configMap = {};
        res.data.data.forEach((c) => {
          configMap[c.category] = c;
        });
        setConfigs(configMap);
      }
    } catch (err) {
      console.error('Error loading referral configurations:', err);
      setFeedback({ type: 'error', message: 'Failed to load form configurations. Please check backend server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Incentive Rules
  const fetchRules = useCallback(async () => {
    try {
      setLoadingRules(true);
      const res = await getIncentiveRules({ tenantId: 'COL001' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setIncentiveRules(res.data.data);
      }
    } catch (err) {
      console.warn('Error loading incentive rules:', err);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  // Load Audit History
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await getReferralConfigHistory({ category: historyCategoryFilter });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setAuditHistory(res.data.data);
      }
    } catch (err) {
      console.warn('Error loading audit history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyCategoryFilter]);

  useEffect(() => {
    fetchConfigs();
    fetchRules();
  }, [fetchConfigs, fetchRules]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Synchronize policy form when currentConfig changes
  useEffect(() => {
    if (currentConfig?.generalSettings) {
      setPolicyForm({
        consentText: currentConfig.generalSettings.consentText || '',
        requireConsent: currentConfig.generalSettings.requireConsent !== false,
        enableDuplicateCheck: currentConfig.generalSettings.enableDuplicateCheck !== false,
        duplicateCheckDays: currentConfig.generalSettings.duplicateCheckDays || 90,
        maxSubmissionsPerUser: currentConfig.generalSettings.maxSubmissionsPerUser || 10
      });
    }
  }, [currentConfig]);

  // ── PARTNER ACTIONS ──────────────────────────────────────────────────────────
  const handleOpenAddPartner = (targetCat = '') => {
    setEditingPartner(null);
    setPartnerForm({
      name: '',
      code: '',
      category: targetCat || (activeTab === 'partners' ? 'Credit Card' : currentCategoryName),
      website: '',
      contactEmail: ''
    });
    setShowAddPartnerModal(true);
  };

  const handleOpenEditPartner = (partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name || '',
      code: partner.code || '',
      category: partner.category || currentCategoryName,
      website: partner.website || '',
      contactEmail: partner.contactEmail || ''
    });
    setShowAddPartnerModal(true);
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Partner name is required.' });
      return;
    }

    try {
      setSaving(true);
      const categoryToUse = activeTab === 'partners' ? (partnerForm.category || 'Credit Card') : currentCategoryName;
      const targetConfig = configs[categoryToUse] || currentConfig;

      if (editingPartner) {
        const updatedPartners = (targetConfig.partners || []).map((p) => {
          if (p.id === editingPartner.id) {
            return {
              ...p,
              name: partnerForm.name.trim(),
              code: partnerForm.code.trim(),
              category: partnerForm.category.trim(),
              website: partnerForm.website.trim(),
              contactEmail: partnerForm.contactEmail.trim()
            };
          }
          return p;
        });

        await updateReferralFormConfig(categoryToUse, {
          ...targetConfig,
          partners: updatedPartners
        });
        setFeedback({ type: 'success', message: `Partner "${partnerForm.name}" updated successfully.` });
      } else {
        await addReferralPartner(categoryToUse, partnerForm);
        setFeedback({ type: 'success', message: `Partner "${partnerForm.name}" added to ${categoryToUse}.` });
      }
      setShowAddPartnerModal(false);
      await fetchConfigs();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePartner = async (categoryName, partnerId) => {
    try {
      const res = await toggleReferralPartner(categoryName, partnerId);
      if (res?.data?.success) {
        setFeedback({ type: 'info', message: res.data.message });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  // ── PRODUCT ACTIONS ──────────────────────────────────────────────────────────
  const handleOpenAddProduct = (defaultPartnerId = '') => {
    setEditingProduct(null);
    const initialPartnerId = defaultPartnerId || currentConfig?.partners?.[0]?.id || '';
    setProductForm({
      partnerId: initialPartnerId,
      name: '',
      productCategory: currentConfig?.categoriesList?.[0] || 'Standard',
      eligibilityConditions: '',
      requiredDocuments: '',
      annualFee: '',
      turnaroundTime: ''
    });
    setShowAddProductModal(true);
  };

  const handleOpenEditProduct = (partnerId, product) => {
    setEditingProduct({ partnerId, ...product });
    setProductForm({
      partnerId: partnerId,
      name: product.name || '',
      productCategory: product.productCategory || '',
      eligibilityConditions: product.eligibilityConditions || '',
      requiredDocuments: Array.isArray(product.requiredDocuments) ? product.requiredDocuments.join(', ') : '',
      annualFee: product.annualFee || '',
      turnaroundTime: product.turnaroundTime || ''
    });
    setShowAddProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Product / Variant name is required.' });
      return;
    }
    if (!productForm.partnerId) {
      setFeedback({ type: 'error', message: 'Please select an associated partner.' });
      return;
    }

    try {
      setSaving(true);
      const docsArray = productForm.requiredDocuments
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingProduct) {
        const updatedPartners = (currentConfig.partners || []).map((p) => {
          if (p.id === editingProduct.partnerId) {
            const updatedProds = (p.products || []).map((prod) => {
              if (prod.id === editingProduct.id) {
                return {
                  ...prod,
                  name: productForm.name.trim(),
                  productCategory: productForm.productCategory,
                  eligibilityConditions: productForm.eligibilityConditions,
                  requiredDocuments: docsArray,
                  annualFee: productForm.annualFee,
                  turnaroundTime: productForm.turnaroundTime
                };
              }
              return prod;
            });
            return { ...p, products: updatedProds };
          }
          return p;
        });

        await updateReferralFormConfig(currentCategoryName, {
          ...currentConfig,
          partners: updatedPartners
        });
        setFeedback({ type: 'success', message: `Product "${productForm.name}" updated successfully.` });
      } else {
        await addReferralProduct(currentCategoryName, productForm.partnerId, {
          ...productForm,
          requiredDocuments: docsArray
        });
        setFeedback({ type: 'success', message: `Product "${productForm.name}" added successfully.` });
      }

      setShowAddProductModal(false);
      await fetchConfigs();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProduct = async (partnerId, productId) => {
    try {
      const res = await toggleReferralProduct(currentCategoryName, partnerId, productId);
      if (res?.data?.success) {
        setFeedback({ type: 'info', message: res.data.message });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  // ── FORM BUILDER PUBLISHING & DRAFT ACTIONS ──────────────────────────────
  const handlePublishForm = async (catName) => {
    try {
      setSaving(true);
      const res = await publishReferralForm(catName);
      if (res?.data?.success) {
        setFeedback({
          type: 'success',
          message: `${catName} Referral Form published live (Version ${res.data.data?.version || 1})! Users can now submit referrals.`
        });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublishForm = async (catName) => {
    try {
      setSaving(true);
      const res = await unpublishReferralForm(catName);
      if (res?.data?.success) {
        setFeedback({
          type: 'info',
          message: `${catName} Referral Form moved to Draft mode. Public submissions are paused.`
        });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (catName) => {
    try {
      setSaving(true);
      const targetConfig = configs[catName] || currentConfig;
      const res = await saveReferralFormDraft(catName, targetConfig);
      if (res?.data?.success) {
        setFeedback({
          type: 'success',
          message: `Draft changes for "${catName} Referral Form" saved successfully.`
        });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── FORM FIELD REORDER & DELETE ──────────────────────────────────────────────
  const handleMoveField = async (catName, fieldIndex, direction) => {
    const targetConfig = configs[catName];
    if (!targetConfig || !Array.isArray(targetConfig.fieldsConfig)) return;
    const fields = [...targetConfig.fieldsConfig];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const temp = fields[fieldIndex];
    fields[fieldIndex] = fields[targetIndex];
    fields[targetIndex] = temp;

    fields.forEach((f, idx) => { f.sortOrder = idx + 1; });

    try {
      setSaving(true);
      await updateReferralFormFields(catName, fields);
      await fetchConfigs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (catName, fieldKey) => {
    const targetConfig = configs[catName];
    if (!targetConfig) return;
    const fieldToDelete = targetConfig.fieldsConfig?.find(f => f.fieldKey === fieldKey);

    if (!window.confirm(`Are you sure you want to delete form field "${fieldToDelete?.label || fieldKey}" from the ${catName} referral form?`)) {
      return;
    }

    const updatedFields = (targetConfig.fieldsConfig || []).filter(f => f.fieldKey !== fieldKey);
    try {
      setSaving(true);
      await updateReferralFormFields(catName, updatedFields);
      setFeedback({ type: 'success', message: `Field "${fieldToDelete?.label || fieldKey}" deleted successfully.` });
      await fetchConfigs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── FORM FIELD CREATE & EDIT ────────────────────────────────────────────────
  const handleOpenCreateField = (catName) => {
    setEditingField(null);
    setFieldForm({
      fieldKey: '',
      label: '',
      description: '',
      step: stepFilter === '2' ? 2 : 1,
      fieldType: 'text',
      isRequired: false,
      isVisible: true,
      placeholder: '',
      helpText: '',
      options: [],
      optionsString: '',
      newOptionInput: '',
      editingOptionIndex: null,
      editingOptionText: '',
      optionsMode: 'list',
      validationRule: 'none',
      errorMessage: ''
    });
    setShowEditFieldModal(true);
  };

  const handleOpenEditField = (field) => {
    setEditingField(field);
    const existingOptions = Array.isArray(field.options) ? [...field.options] : [];
    setFieldForm({
      fieldKey: field.fieldKey,
      label: field.label || '',
      description: field.description || '',
      step: field.step || 1,
      fieldType: field.fieldType || (existingOptions.length > 0 ? 'dropdown' : 'text'),
      isRequired: field.isRequired !== false,
      isVisible: field.isVisible !== false,
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      options: existingOptions,
      optionsString: existingOptions.join(', '),
      newOptionInput: '',
      editingOptionIndex: null,
      editingOptionText: '',
      optionsMode: 'list',
      validationRule: field.validationRule || 'none',
      errorMessage: field.errorMessage || ''
    });
    setShowEditFieldModal(true);
  };

  // ── Dropdown Option List Helpers ──
  const handleAddOptionToField = (optionText) => {
    const textToAdd = (optionText !== undefined ? optionText : fieldForm.newOptionInput || '').trim();
    if (!textToAdd) return;

    let items = [];
    if (textToAdd.includes(',')) {
      items = textToAdd.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      items = [textToAdd];
    }

    const currentOptions = Array.isArray(fieldForm.options) ? [...fieldForm.options] : [];
    const updated = [...currentOptions];

    items.forEach(item => {
      if (item && !updated.includes(item)) {
        updated.push(item);
      }
    });

    setFieldForm(prev => ({
      ...prev,
      options: updated,
      optionsString: updated.join(', '),
      newOptionInput: ''
    }));
  };

  const handleDeleteOptionFromField = (index) => {
    const currentOptions = Array.isArray(fieldForm.options) ? [...fieldForm.options] : [];
    const updated = currentOptions.filter((_, i) => i !== index);
    setFieldForm(prev => ({
      ...prev,
      options: updated,
      optionsString: updated.join(', '),
      editingOptionIndex: prev.editingOptionIndex === index ? null : prev.editingOptionIndex
    }));
  };

  const handleMoveOptionInField = (index, direction) => {
    const currentOptions = Array.isArray(fieldForm.options) ? [...fieldForm.options] : [];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentOptions.length) return;

    const temp = currentOptions[index];
    currentOptions[index] = currentOptions[targetIdx];
    currentOptions[targetIdx] = temp;

    setFieldForm(prev => ({
      ...prev,
      options: currentOptions,
      optionsString: currentOptions.join(', ')
    }));
  };

  const handleStartEditOption = (index) => {
    setFieldForm(prev => ({
      ...prev,
      editingOptionIndex: index,
      editingOptionText: prev.options[index] || ''
    }));
  };

  const handleSaveOptionEdit = (index) => {
    const newText = (fieldForm.editingOptionText || '').trim();
    if (!newText) {
      handleDeleteOptionFromField(index);
      return;
    }
    const currentOptions = Array.isArray(fieldForm.options) ? [...fieldForm.options] : [];
    currentOptions[index] = newText;
    setFieldForm(prev => ({
      ...prev,
      options: currentOptions,
      optionsString: currentOptions.join(', '),
      editingOptionIndex: null,
      editingOptionText: ''
    }));
  };

  const handleCancelOptionEdit = () => {
    setFieldForm(prev => ({
      ...prev,
      editingOptionIndex: null,
      editingOptionText: ''
    }));
  };

  const handleSyncOptionsFromCsv = (csvStr) => {
    const parsed = csvStr ? csvStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    setFieldForm(prev => ({
      ...prev,
      optionsString: csvStr,
      options: parsed
    }));
  };

  const handleImportCurrentPartners = () => {
    const catName = activeTab === 'fields' ? fieldCategoryFilter : currentCategoryName;
    const catConfig = configs[catName] || currentConfig;
    const activePartners = (catConfig?.partners || [])
      .filter(p => p.isActive !== false)
      .map(p => p.name);

    if (activePartners.length === 0) {
      setFeedback({ type: 'info', message: `No active partners found in ${catName} referral settings.` });
      return;
    }

    const currentOptions = Array.isArray(fieldForm.options) ? [...fieldForm.options] : [];
    const merged = [...currentOptions];
    activePartners.forEach(pName => {
      if (!merged.includes(pName)) merged.push(pName);
    });

    setFieldForm(prev => ({
      ...prev,
      options: merged,
      optionsString: merged.join(', ')
    }));
  };

  const handleSaveFieldForm = async (e) => {
    e.preventDefault();
    const catName = activeTab === 'fields' ? fieldCategoryFilter : currentCategoryName;
    const targetConfig = configs[catName];
    if (!targetConfig) return;

    let optionsArray = [];
    if (Array.isArray(fieldForm.options) && fieldForm.options.length > 0) {
      optionsArray = fieldForm.options.map(s => String(s).trim()).filter(Boolean);
    } else if (fieldForm.optionsString) {
      optionsArray = fieldForm.optionsString.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (['dropdown', 'radio', 'checkbox'].includes(fieldForm.fieldType) && optionsArray.length === 0) {
      setFeedback({
        type: 'error',
        message: `Dropdown field "${fieldForm.label || 'Field'}" must have at least one option configured.`
      });
      return;
    }

    let updatedFields = [...(targetConfig.fieldsConfig || [])];

    if (editingField) {
      updatedFields = updatedFields.map((f) => {
        if (f.fieldKey === editingField.fieldKey) {
          return {
            ...f,
            label: fieldForm.label.trim(),
            description: (fieldForm.description || '').trim(),
            step: Number(fieldForm.step),
            fieldType: fieldForm.fieldType,
            isRequired: Boolean(fieldForm.isRequired),
            isVisible: fieldForm.isVisible !== false,
            placeholder: (fieldForm.placeholder || '').trim(),
            helpText: (fieldForm.helpText || '').trim(),
            validationRule: fieldForm.validationRule,
            errorMessage: (fieldForm.errorMessage || '').trim(),
            options: optionsArray
          };
        }
        return f;
      });
    } else {
      let key = (fieldForm.fieldKey || '').trim();
      if (!key) {
        key = fieldForm.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
      }
      if (!key) {
        setFeedback({ type: 'error', message: 'Field key or label is required.' });
        return;
      }
      if (updatedFields.some((f) => f.fieldKey === key)) {
        setFeedback({ type: 'error', message: `Field key "${key}" already exists. Please choose a distinct key.` });
        return;
      }

      const newFieldObj = {
        fieldKey: key,
        label: fieldForm.label.trim(),
        description: (fieldForm.description || '').trim(),
        step: Number(fieldForm.step),
        fieldType: fieldForm.fieldType,
        isRequired: fieldForm.isRequired,
        isVisible: fieldForm.isVisible,
        isSystem: false,
        placeholder: (fieldForm.placeholder || '').trim(),
        helpText: (fieldForm.helpText || '').trim(),
        validationRule: fieldForm.validationRule,
        errorMessage: (fieldForm.errorMessage || '').trim(),
        options: optionsArray,
        sortOrder: updatedFields.length + 1
      };
      updatedFields.push(newFieldObj);
    }

    try {
      setSaving(true);
      await updateReferralFormFields(catName, updatedFields);
      setFeedback({
        type: 'success',
        message: editingField
          ? `Field "${fieldForm.label}" updated.`
          : `New field "${fieldForm.label}" added to ${catName} Referral Form.`
      });
      setShowEditFieldModal(false);
      await fetchConfigs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFieldRequired = async (categoryName, fieldKey) => {
    const targetConfig = configs[categoryName];
    if (!targetConfig) return;
    const targetField = targetConfig.fieldsConfig?.find((f) => f.fieldKey === fieldKey);

    const updatedFields = (targetConfig.fieldsConfig || []).map((f) => {
      if (f.fieldKey === fieldKey) {
        return { ...f, isRequired: !f.isRequired };
      }
      return f;
    });

    try {
      await updateReferralFormFields(categoryName, updatedFields);
      setFeedback({ type: 'success', message: `Field "${targetField?.label}" requirement updated.` });
      await fetchConfigs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleFieldVisible = async (categoryName, fieldKey) => {
    const targetConfig = configs[categoryName];
    if (!targetConfig) return;
    const targetField = targetConfig.fieldsConfig?.find((f) => f.fieldKey === fieldKey);

    const updatedFields = (targetConfig.fieldsConfig || []).map((f) => {
      if (f.fieldKey === fieldKey) {
        return { ...f, isVisible: !f.isVisible };
      }
      return f;
    });

    try {
      await updateReferralFormFields(categoryName, updatedFields);
      setFeedback({ type: 'success', message: `Field "${targetField?.label}" visibility updated.` });
      await fetchConfigs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedGeneralSettings = {
        ...(currentConfig?.generalSettings || {}),
        consentText: policyForm.consentText,
        requireConsent: policyForm.requireConsent,
        enableDuplicateCheck: policyForm.enableDuplicateCheck,
        duplicateCheckDays: Number(policyForm.duplicateCheckDays) || 90,
        maxSubmissionsPerUser: Number(policyForm.maxSubmissionsPerUser) || 10
      };
      const res = await updateReferralFormConfig(currentCategoryName, {
        generalSettings: updatedGeneralSettings
      });
      if (res?.data?.success) {
        setFeedback({ type: 'success', message: `${currentCategoryName} DPDP & policy settings saved successfully.` });
        await fetchConfigs();
      }
    } catch (err) {
      console.error('Error saving policy settings:', err);
      setFeedback({ type: 'error', message: 'Failed to save policy settings.' });
    } finally {
      setSaving(false);
    }
  };

  // ── RESET CONFIG TO DEFAULTS ─────────────────────────────────────────────────
  const handleResetDefaults = async () => {
    if (!window.confirm(`Are you sure you want to reset all settings for "${currentCategoryName}" to verified institutional defaults?`)) {
      return;
    }
    try {
      setSaving(true);
      const res = await resetReferralFormConfig(currentCategoryName);
      if (res?.data?.success) {
        setFeedback({ type: 'success', message: `Reset "${currentCategoryName}" to verified system template.` });
        await fetchConfigs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── INCENTIVE RULES ACTIONS ──────────────────────────────────────────────────
  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleForm({
      ruleName: '',
      category: 'Credit Card',
      partnerName: 'All',
      productOrRole: 'All',
      milestone: 'Physical card dispatch & activation confirmation',
      amount: 1000,
      eligibilityConditions: 'Applicant meets minimum partner bank criteria.',
      approvalStatus: 'Approved',
      isActive: true,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: ''
    });
    setShowAddRuleModal(true);
  };

  const handleOpenEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      ruleName: rule.ruleName || '',
      category: rule.category || 'Credit Card',
      partnerName: rule.partnerName || 'All',
      productOrRole: rule.productOrRole || 'All',
      milestone: rule.milestone || '',
      amount: rule.amount || 0,
      eligibilityConditions: rule.eligibilityConditions || '',
      approvalStatus: rule.approvalStatus || 'Approved',
      isActive: rule.isActive !== false,
      effectiveFrom: rule.effectiveFrom ? rule.effectiveFrom.split('T')[0] : '',
      effectiveTo: rule.effectiveTo ? rule.effectiveTo.split('T')[0] : ''
    });
    setShowAddRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.ruleName.trim()) {
      setFeedback({ type: 'error', message: 'Rule title is required.' });
      return;
    }
    if (!ruleForm.amount || Number(ruleForm.amount) < 0) {
      setFeedback({ type: 'error', message: 'Enter a valid incentive amount in Indian Rupees.' });
      return;
    }

    try {
      setSaving(true);
      if (editingRule) {
        await updateIncentiveRule(editingRule._id, {
          ...ruleForm,
          amount: Number(ruleForm.amount)
        });
        setFeedback({ type: 'success', message: `Incentive rule "${ruleForm.ruleName}" updated.` });
      } else {
        await createIncentiveRule({
          ...ruleForm,
          amount: Number(ruleForm.amount),
          amountType: 'Fixed'
        });
        setFeedback({ type: 'success', message: `Incentive rule "${ruleForm.ruleName}" created.` });
      }
      setShowAddRuleModal(false);
      await fetchRules();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId, ruleName) => {
    if (!window.confirm(`Delete incentive rule "${ruleName}"? Historical referrals will retain their locked rates.`)) {
      return;
    }
    try {
      await deleteIncentiveRule(ruleId);
      setFeedback({ type: 'info', message: `Incentive rule deleted.` });
      await fetchRules();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // ── FILTERED DATA COMPUTATION ────────────────────────────────────────────────
  const filteredPartners = useMemo(() => {
    if (!currentConfig || !Array.isArray(currentConfig.partners)) return [];
    return currentConfig.partners.filter((p) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [currentConfig, searchQuery]);

  // All partners across all 4 categories for Tab 5
  const allPartnersUnified = useMemo(() => {
    const list = [];
    Object.keys(configs).forEach((catKey) => {
      const cfg = configs[catKey];
      (cfg.partners || []).forEach((p) => {
        list.push({
          ...p,
          parentCategory: catKey
        });
      });
    });
    return list.filter((p) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [configs, searchQuery]);

  const allProductsFlat = useMemo(() => {
    if (!currentConfig || !Array.isArray(currentConfig.partners)) return [];
    const list = [];
    currentConfig.partners.forEach((p) => {
      (p.products || []).forEach((prod) => {
        list.push({
          ...prod,
          partnerId: p.id,
          partnerName: p.name,
          partnerActive: p.isActive
        });
      });
    });
    return list.filter((item) => {
      const matchesPartner = selectedPartnerFilter === 'All' || item.partnerId === selectedPartnerFilter;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.productCategory && item.productCategory.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesPartner && matchesSearch;
    });
  }, [currentConfig, selectedPartnerFilter, searchQuery]);

  // Total metrics
  const totalPartnersCount = useMemo(() => {
    return Object.values(configs).reduce((acc, c) => acc + (c.partners?.length || 0), 0);
  }, [configs]);

  const totalProductsCount = useMemo(() => {
    return Object.values(configs).reduce((acc, c) => {
      const prods = (c.partners || []).reduce((pAcc, p) => pAcc + (p.products?.length || 0), 0);
      return acc + prods;
    }, 0);
  }, [configs]);

  return (
    <div className="management-page animate-fade-in">
      {/* ── Page Header ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1, #a855f7)' }}></div>

        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Super Admin Business Referral Command Center</span>
            </div>
            <h1>Business Referral Management</h1>
            <p>
              Centrally manage partner banks, approved card/insurance/banking products, job referral roles, field requirement rules, and real-time incentive payout policies across all four referral forms.
            </p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 600 }}
              onClick={() => navigate('/superadmin/business-referral')}
              title="Navigate to All Referral Categories Overview"
            >
              <Layers size={15} />
              <span>All Categories</span>
            </button>

            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => navigate('/superadmin/business-referrals')}
              title="Open Referral Publishing & Applications Central"
            >
              <ArrowLeft size={15} />
              <span>Publishing Central</span>
            </button>

            {['credit-card', 'insurance', 'job-referral', 'account-opening'].includes(activeTab) && (
              <button
                type="button"
                className="mgmt-btn-secondary"
                onClick={handleResetDefaults}
                disabled={saving}
                title="Reset current category to institutional verified template"
              >
                <RefreshCw size={15} className={saving ? 'animate-spin' : ''} />
                <span>Reset Defaults</span>
              </button>
            )}
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Dashboard: <strong>Super Admin</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Total Institutional Partners: <strong>{totalPartnersCount}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Total Approved Offerings: <strong>{totalProductsCount}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Database Sync: <strong>Live Dynamic Forms Connected</strong></span>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div className={`brs-notice-banner ${feedback.type} animate-fade-in`}>
          {feedback.type === 'success' && <CheckCircle2 size={18} />}
          {feedback.type === 'error' && <AlertCircle size={18} />}
          {feedback.type === 'warning' && <ShieldAlert size={18} />}
          {feedback.type === 'info' && <Info size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── 9 Main Configuration Tabs ── */}
      <div className="brs-nav-wrapper">
        <div className="brs-tabs-scroll">
          {/* Quick link to All Categories Dashboard */}
          <button
            className="brs-tab-btn central"
            style={{ background: '#e0f2fe', borderColor: '#bae6fd', color: '#0369a1' }}
            onClick={() => navigate('/superadmin/business-referral')}
            title="Navigate to All Categories Referral Dashboard"
          >
            <Layers size={16} style={{ color: '#0284c7' }} />
            <span style={{ fontWeight: 700 }}>All Categories</span>
          </button>
          {/* Primary Form Category Tabs */}
          <button
            className={`brs-tab-btn ${activeTab === 'credit-card' ? 'active' : ''}`}
            onClick={() => { setActiveTab('credit-card'); setCategorySubView('builder'); setSearchQuery(''); setSelectedPartnerFilter('All'); }}
          >
            <CreditCard size={16} />
            <span>Credit Card Referral Form</span>
            <span
              className="brs-tab-badge"
              style={{
                background: configs['Credit Card']?.status === 'draft' ? '#fef3c7' : '#dcfce7',
                color: configs['Credit Card']?.status === 'draft' ? '#92400e' : '#15803d',
                fontWeight: 800
              }}
            >
              {configs['Credit Card']?.status === 'draft' ? 'Draft' : `Published v${configs['Credit Card']?.version || 1}`}
            </span>
          </button>

          <button
            className={`brs-tab-btn ${activeTab === 'insurance' ? 'active' : ''}`}
            onClick={() => { setActiveTab('insurance'); setCategorySubView('builder'); setSearchQuery(''); setSelectedPartnerFilter('All'); }}
          >
            <ShieldCheck size={16} />
            <span>Insurance Referral Form</span>
            <span
              className="brs-tab-badge"
              style={{
                background: configs['Insurance']?.status === 'draft' ? '#fef3c7' : '#dcfce7',
                color: configs['Insurance']?.status === 'draft' ? '#92400e' : '#15803d',
                fontWeight: 800
              }}
            >
              {configs['Insurance']?.status === 'draft' ? 'Draft' : `Published v${configs['Insurance']?.version || 1}`}
            </span>
          </button>

          <button
            className={`brs-tab-btn ${activeTab === 'job-referral' ? 'active' : ''}`}
            onClick={() => { setActiveTab('job-referral'); setCategorySubView('builder'); setSearchQuery(''); setSelectedPartnerFilter('All'); }}
          >
            <Briefcase size={16} />
            <span>Job Referral Form</span>
            <span
              className="brs-tab-badge"
              style={{
                background: configs['Job']?.status === 'draft' ? '#fef3c7' : '#dcfce7',
                color: configs['Job']?.status === 'draft' ? '#92400e' : '#15803d',
                fontWeight: 800
              }}
            >
              {configs['Job']?.status === 'draft' ? 'Draft' : `Published v${configs['Job']?.version || 1}`}
            </span>
          </button>

          <button
            className={`brs-tab-btn ${activeTab === 'account-opening' ? 'active' : ''}`}
            onClick={() => { setActiveTab('account-opening'); setCategorySubView('builder'); setSearchQuery(''); setSelectedPartnerFilter('All'); }}
          >
            <Building size={16} />
            <span>Bank Account Referral Form</span>
            <span
              className="brs-tab-badge"
              style={{
                background: configs['Bank Account']?.status === 'draft' ? '#fef3c7' : '#dcfce7',
                color: configs['Bank Account']?.status === 'draft' ? '#92400e' : '#15803d',
                fontWeight: 800
              }}
            >
              {configs['Bank Account']?.status === 'draft' ? 'Draft' : `Published v${configs['Bank Account']?.version || 1}`}
            </span>
          </button>

          <div className="brs-tab-divider" />

          {/* Centralized Management Tabs */}
          <button
            className={`brs-tab-btn central ${activeTab === 'partners' ? 'active' : ''}`}
            onClick={() => { setActiveTab('partners'); setSearchQuery(''); }}
          >
            <Users2 size={16} />
            <span>Partner Management</span>
            <span className="brs-tab-badge">{totalPartnersCount}</span>
          </button>

          <button
            className={`brs-tab-btn central ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => { setActiveTab('fields'); setSearchQuery(''); }}
          >
            <SlidersHorizontal size={16} />
            <span>Form Field Management</span>
          </button>

          <button
            className={`brs-tab-btn central ${activeTab === 'incentives' ? 'active' : ''}`}
            onClick={() => { setActiveTab('incentives'); setSearchQuery(''); }}
          >
            <Award size={16} />
            <span>Incentive Configuration</span>
            <span className="brs-tab-badge" style={{ background: '#10b981', color: '#fff' }}>₹ Rules</span>
          </button>

          <button
            className={`brs-tab-btn central ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => { setActiveTab('rules'); setSearchQuery(''); }}
          >
            <Scale size={16} />
            <span>Referral Rules & Eligibility</span>
          </button>

          <button
            className={`brs-tab-btn central ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setSearchQuery(''); }}
          >
            <History size={16} />
            <span>Configuration History</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TABS 1 TO 4: DYNAMIC REFERRAL FORM SETTINGS                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {['credit-card', 'insurance', 'job-referral', 'account-opening'].includes(activeTab) && (
        <div className="brs-container">

          {/* ── Category Sub-Navigation ── */}
          <div className="brs-category-subnav">
            <button
              type="button"
              className={`brs-subnav-btn ${categorySubView === 'builder' ? 'active' : ''}`}
              onClick={() => setCategorySubView('builder')}
            >
              <Sparkles size={16} />
              <span>Form Builder & Custom Fields</span>
              <span className={`brs-badge-sm ${currentConfig?.status === 'published' ? 'pub' : 'draft'}`}>
                {currentConfig?.status === 'published' ? `Live v${currentConfig.version || 1}` : 'Draft'}
              </span>
            </button>
            <button
              type="button"
              className={`brs-subnav-btn ${categorySubView === 'partners' ? 'active' : ''}`}
              onClick={() => setCategorySubView('partners')}
            >
              <Building2 size={16} />
              <span>Institutional Partners & Offerings</span>
              <span className="brs-badge-sm count">{currentConfig?.partners?.length || 0}</span>
            </button>
            <button
              type="button"
              className={`brs-subnav-btn ${categorySubView === 'policy' ? 'active' : ''}`}
              onClick={() => setCategorySubView('policy')}
            >
              <ShieldCheck size={16} />
              <span>DPDP Consent & Form Policies</span>
            </button>
          </div>

          {/* ── SUBVIEW 1: FORM BUILDER CANVAS ── */}
          {categorySubView === 'builder' && (
            <div className="brs-builder-wrap">
              {/* Top Control Bar */}
              <div className="brs-builder-control-bar">
                <div className="brs-builder-title-block">
                  <div className="brs-builder-header-line">
                    <h3 className="brs-builder-title">{currentCategoryName} Referral Form Builder</h3>
                    <span className={`brs-status-pill ${currentConfig?.status === 'published' ? 'published' : 'draft'}`}>
                      {currentConfig?.status === 'published'
                        ? `● Published (v${currentConfig?.version || 1}) — Active in User Dashboards`
                        : `○ Draft Mode (v${currentConfig?.version || 1}) — Hidden from Standard Users`}
                    </span>
                  </div>
                  <p className="brs-builder-subtitle">
                    Configure 4-step submission fields, arrange input ordering, configure dropdowns and validation rules, preview the live wizard, and publish changes.
                  </p>
                </div>

                <div className="brs-builder-actions">
                  <button
                    type="button"
                    className="mgmt-btn-secondary"
                    onClick={() => setShowPreviewModal(true)}
                    title="Test live 4-step wizard before publishing"
                  >
                    <Eye size={15} />
                    <span>Preview Form</span>
                  </button>

                  <button
                    type="button"
                    className="mgmt-btn-secondary"
                    onClick={() => handleSaveDraft(currentCategoryName)}
                    disabled={saving}
                    title="Save current schema changes as draft"
                  >
                    <Save size={15} />
                    <span>Save Draft</span>
                  </button>

                  {currentConfig?.status === 'published' ? (
                    <button
                      type="button"
                      className="mgmt-btn-secondary"
                      style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }}
                      onClick={() => handleUnpublishForm(currentCategoryName)}
                      disabled={saving}
                      title="Move form to draft to pause public submissions"
                    >
                      <ShieldOff size={15} />
                      <span>Unpublish Form</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mgmt-btn-primary"
                      style={{ background: '#059669', borderColor: '#059669' }}
                      onClick={() => handlePublishForm(currentCategoryName)}
                      disabled={saving}
                      title="Publish form to make it active for users"
                    >
                      <Send size={15} />
                      <span>Publish Form</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="mgmt-btn-primary"
                    onClick={() => handleOpenCreateField(currentCategoryName)}
                  >
                    <Plus size={16} />
                    <span>Add Form Field</span>
                  </button>
                </div>
              </div>

              {/* Step Filter Tabs */}
              <div className="brs-step-tabs">
                <button
                  type="button"
                  className={`brs-step-tab-btn ${stepFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStepFilter('all')}
                >
                  All Fields ({currentConfig?.fieldsConfig?.length || 0})
                </button>
                <button
                  type="button"
                  className={`brs-step-tab-btn ${stepFilter === '1' ? 'active' : ''}`}
                  onClick={() => setStepFilter('1')}
                >
                  Step 1: Applicant Information ({(currentConfig?.fieldsConfig || []).filter(f => !f.step || f.step === 1).length})
                </button>
                <button
                  type="button"
                  className={`brs-step-tab-btn ${stepFilter === '2' ? 'active' : ''}`}
                  onClick={() => setStepFilter('2')}
                >
                  Step 2: Partner & Referral Details ({(currentConfig?.fieldsConfig || []).filter(f => f.step === 2).length})
                </button>
              </div>

              {/* Form Fields Canvas List */}
              <div className="brs-fields-list">
                {(!currentConfig?.fieldsConfig || currentConfig.fieldsConfig.length === 0) ? (
                  <div className="brs-field-empty">
                    <AlertCircle size={32} color="#94a3b8" />
                    <p style={{ fontWeight: 700, margin: '8px 0 2px 0', color: '#1e293b' }}>No fields configured yet</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Click "Add Form Field" to add your first dynamic field.</p>
                  </div>
                ) : (
                  (currentConfig.fieldsConfig || [])
                    .filter(f => {
                      if (stepFilter === '1') return !f.step || f.step === 1;
                      if (stepFilter === '2') return f.step === 2;
                      return true;
                    })
                    .map((field, index, arr) => {
                      const actualIdx = (currentConfig.fieldsConfig || []).findIndex(x => x.fieldKey === field.fieldKey);
                      return (
                        <div key={field.fieldKey} className={`brs-field-item-card ${field.isSystem ? 'system' : ''}`}>
                          {/* Reorder Arrows */}
                          <div className="brs-reorder-group">
                            <button
                              type="button"
                              className="brs-reorder-btn"
                              disabled={actualIdx === 0 || saving}
                              onClick={() => handleMoveField(currentCategoryName, actualIdx, 'up')}
                              title="Move field up"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <span className="brs-field-order-num">{actualIdx + 1}</span>
                            <button
                              type="button"
                              className="brs-reorder-btn"
                              disabled={actualIdx === (currentConfig.fieldsConfig.length - 1) || saving}
                              onClick={() => handleMoveField(currentCategoryName, actualIdx, 'down')}
                              title="Move field down"
                            >
                              <ChevronDown size={15} />
                            </button>
                          </div>

                          {/* Field Info */}
                          <div className="brs-field-item-main">
                            <div className="brs-field-header-row">
                              <h4 className="brs-field-item-label">{field.label}</h4>
                              <code className="brs-field-item-key">{field.fieldKey}</code>
                              <span className="brs-field-type-pill">{field.fieldType || (field.options?.length > 0 ? 'dropdown' : 'text')}</span>
                              <span className="brs-field-step-pill">Step {field.step || 1}</span>
                              <span className={`brs-field-req-pill ${field.isRequired ? 'required' : 'optional'}`}>
                                {field.isRequired ? 'Required' : 'Optional'}
                              </span>
                              {field.isSystem && (
                                <span className="brs-field-sys-pill" title="Core system tracking field">System Core</span>
                              )}
                            </div>

                            {field.description && (
                              <p className="brs-field-item-desc">{field.description}</p>
                            )}

                            {Array.isArray(field.options) && field.options.length > 0 && (
                              <div className="brs-field-item-opts">
                                <span style={{ fontWeight: 600, color: '#475569' }}>Configured Options ({field.options.length}):</span>
                                {field.options.slice(0, 5).map((opt, i) => (
                                  <span key={i} className="brs-field-opt-chip">{opt}</span>
                                ))}
                                {field.options.length > 5 && (
                                  <span className="brs-field-opt-chip more">+{field.options.length - 5} more</span>
                                )}
                              </div>
                            )}

                            {field.validationRule && field.validationRule !== 'none' && (
                              <div style={{ fontSize: '0.74rem', color: '#6366f1', marginTop: '4px', fontWeight: 600 }}>
                                Validation: {field.validationRule} {field.errorMessage ? `• Error: "${field.errorMessage}"` : ''}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="brs-field-item-actions">
                            <button
                              type="button"
                              className="mgmt-btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleOpenEditField(field)}
                              title="Edit field settings"
                            >
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="mgmt-btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteField(currentCategoryName, field.fieldKey)}
                              title="Delete field from form"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ── SUBVIEW 2: PARTNERS & PRODUCTS ── */}
          {categorySubView === 'partners' && (
            <>
              {/* ── Section A: Partner Management ── */}
              <div className="brs-card">
                <div className="brs-card-header">
                  <div className="brs-card-title-group">
                    <div className="brs-card-icon-box">
                      <Building2 size={22} />
                    </div>
                <div>
                  <h2 className="brs-card-title">
                    {activeTab === 'credit-card' && 'Partner Bank Management'}
                    {activeTab === 'insurance' && 'Approved Partner Insurer Management'}
                    {activeTab === 'job-referral' && 'Corporate Hiring Partner Management'}
                    {activeTab === 'account-opening' && 'Participating Partner Bank Management'}
                  </h2>
                  <p className="brs-card-subtitle">
                    Add, edit, activate, deactivate, and view partner institutions. Deactivated partners will not appear in the referral forms.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <div className="brs-search-box">
                  <Search size={15} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search partners by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => handleOpenAddPartner()}
                >
                  <Plus size={16} />
                  <span>
                    {activeTab === 'credit-card' && 'Add Partner Bank'}
                    {activeTab === 'insurance' && 'Add Insurance Provider'}
                    {activeTab === 'job-referral' && 'Add Corporate Partner'}
                    {activeTab === 'account-opening' && 'Add Partner Bank'}
                  </span>
                </button>
              </div>
            </div>

            {/* Partner Cards Grid */}
            <div className="brs-partner-grid">
              {filteredPartners.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '2.5rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px auto', color: '#94a3b8' }} />
                  <p style={{ fontWeight: 700, margin: 0, color: '#1e293b' }}>No partner records found matching "{searchQuery}"</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "Add Partner" to create a new verified partner.</p>
                </div>
              ) : (
                filteredPartners.map((partner) => {
                  const avatarTheme = getPartnerAvatarStyle(partner, currentCategoryName);
                  const monogram = getPartnerMonogram(partner);
                  return (
                    <div key={partner.id} className={`brs-partner-card ${!partner.isActive ? 'inactive' : ''}`}>
                      <div className="brs-partner-card-header">
                        <div className="brs-partner-identity">
                          {/* Monogram Badge without overflow */}
                          <div
                            className="brs-partner-avatar"
                            style={{ background: avatarTheme.bg, color: avatarTheme.color, borderColor: avatarTheme.border }}
                            title={partner.name}
                          >
                            {monogram}
                          </div>
                          <div className="brs-partner-info">
                            <h4 className="brs-partner-name" title={partner.name}>{partner.name}</h4>
                            <p className="brs-partner-code">
                              {partner.code ? `Code: ${partner.code}` : ''} {partner.category ? `• ${partner.category}` : ''}
                            </p>
                          </div>
                        </div>

                        <label className="brs-switch" title={partner.isActive !== false ? 'Deactivate Partner' : 'Activate Partner'}>
                          <input
                            type="checkbox"
                            checked={partner.isActive !== false}
                            onChange={() => handleTogglePartner(currentCategoryName, partner.id)}
                          />
                          <span className="brs-slider"></span>
                        </label>
                      </div>

                      <div className="brs-partner-mid">
                        <span>
                          Approved Products: <strong style={{ color: '#0f172a' }}>{partner.products?.length || 0}</strong>
                        </span>
                        <span className={`brs-status-badge ${partner.isActive !== false ? 'active' : 'inactive'}`}>
                          {partner.isActive !== false ? 'Active in Form' : 'Deactivated'}
                        </span>
                      </div>

                      <div className="brs-partner-actions">
                        <button
                          type="button"
                          className="mgmt-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', flex: 1, justifyContent: 'center' }}
                          onClick={() => handleOpenEditPartner(partner)}
                        >
                          <Edit size={13} />
                          <span>Edit Partner</span>
                        </button>

                        <button
                          type="button"
                          className="mgmt-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe', flex: 1, justifyContent: 'center', fontWeight: 700 }}
                          onClick={() => handleOpenAddProduct(partner.id)}
                        >
                          <Plus size={13} />
                          <span>Add Product</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Section B: Product / Offering Management ── */}
          <div className="brs-card">
            <div className="brs-card-header">
              <div className="brs-card-title-group">
                <div className="brs-card-icon-box" style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <Layers size={22} />
                </div>
                <div>
                  <h2 className="brs-card-title">
                    {activeTab === 'credit-card' && 'Approved Credit Card Products'}
                    {activeTab === 'insurance' && 'Approved Insurance Policy Offerings'}
                    {activeTab === 'job-referral' && 'Available Jobs & Corporate Roles'}
                    {activeTab === 'account-opening' && 'Approved Account Products'}
                  </h2>
                  <p className="brs-card-subtitle">
                    Configure approved products belonging to each partner, eligibility criteria, required documents, and active status.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <select
                  style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 0.85rem', fontSize: '0.84rem', background: '#ffffff', color: '#1e293b' }}
                  value={selectedPartnerFilter}
                  onChange={(e) => setSelectedPartnerFilter(e.target.value)}
                >
                  <option value="All">All Partners ({currentConfig?.partners?.length || 0})</option>
                  {(currentConfig?.partners || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => handleOpenAddProduct()}
                >
                  <Plus size={16} />
                  <span>
                    {activeTab === 'credit-card' && 'Add Credit Card'}
                    {activeTab === 'insurance' && 'Add Policy Offering'}
                    {activeTab === 'job-referral' && 'Add Job Opportunity'}
                    {activeTab === 'account-opening' && 'Add Account Product'}
                  </span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="brs-table-wrapper">
              <table className="brs-table">
                <thead>
                  <tr>
                    <th>Product / Offering Name</th>
                    <th>Associated Partner</th>
                    <th>Category</th>
                    <th>Eligibility Conditions</th>
                    <th>Required Documents</th>
                    <th>Fee / CTC</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProductsFlat.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No product records found matching current selection.
                      </td>
                    </tr>
                  ) : (
                    allProductsFlat.map((item) => (
                      <tr key={item.id} style={{ opacity: (!item.isActive || !item.partnerActive) ? 0.72 : 1 }}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Turnaround: {item.turnaroundTime || '2-4 business days'}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#334155' }}>{item.partnerName}</span>
                          {!item.partnerActive && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>[Partner Deactivated]</span>
                          )}
                        </td>
                        <td>
                          <span className="brs-field-tag" style={{ background: '#f1f5f9', color: '#1e293b' }}>
                            {item.productCategory || 'Standard'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '220px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.eligibilityConditions || 'Standard eligibility applies'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                            {item.requiredDocuments && item.requiredDocuments.length > 0 ? (
                              item.requiredDocuments.slice(0, 2).map((doc, idx) => (
                                <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                  {doc}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                            )}
                            {item.requiredDocuments && item.requiredDocuments.length > 2 && (
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>+{item.requiredDocuments.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          {item.annualFee || 'Free'}
                        </td>
                        <td>
                          <label className="brs-switch" title={item.isActive ? 'Deactivate Product' : 'Activate Product'}>
                            <input
                              type="checkbox"
                              checked={item.isActive !== false}
                              onChange={() => handleToggleProduct(item.partnerId, item.id)}
                            />
                            <span className="brs-slider"></span>
                          </label>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="mgmt-btn-secondary"
                            style={{ padding: '4px 9px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenEditProduct(item.partnerId, item)}
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}

          {/* ── SUBVIEW 3: DPDP & FORM POLICIES ── */}
          {categorySubView === 'policy' && (
            <div className="brs-card">
              <div className="brs-card-header">
                <div className="brs-card-title-group">
                  <div className="brs-card-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 className="brs-card-title">{currentCategoryName} DPDP & Compliance Policy</h2>
                    <p className="brs-card-subtitle">
                      Configure statutory DPDP consent disclosure, submission caps, and institutional duplicate fraud protection.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSavePolicy} style={{ padding: '1.5rem' }}>
                <div className="brs-form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>
                    Statutory DPDP Consent & Applicant Declaration Statement
                  </label>
                  <textarea
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', color: '#0f172a' }}
                    value={policyForm.consentText}
                    onChange={(e) => setPolicyForm({ ...policyForm, consentText: e.target.value })}
                    placeholder="Enter institutional consent text that applicants must acknowledge before submission..."
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    This consent text will be presented to the applicant in Step 3 of the live referral form.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Enforce Mandatory Consent Acknowledgement</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Applicants cannot proceed to Step 4 without explicitly accepting this declaration.</div>
                    </div>
                    <label className="brs-switch">
                      <input
                        type="checkbox"
                        checked={policyForm.requireConsent}
                        onChange={(e) => setPolicyForm({ ...policyForm, requireConsent: e.target.checked })}
                      />
                      <span className="brs-slider"></span>
                    </label>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Institutional Duplicate Protection</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Prevent re-referring the same applicant mobile number within the configured active window.</div>
                    </div>
                    <label className="brs-switch">
                      <input
                        type="checkbox"
                        checked={policyForm.enableDuplicateCheck}
                        onChange={(e) => setPolicyForm({ ...policyForm, enableDuplicateCheck: e.target.checked })}
                      />
                      <span className="brs-slider"></span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="brs-form-group">
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>Duplicate Window Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                      value={policyForm.duplicateCheckDays}
                      onChange={(e) => setPolicyForm({ ...policyForm, duplicateCheckDays: e.target.value })}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Standard banking SLA cooldown is 90 days.</span>
                  </div>

                  <div className="brs-form-group">
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>Max Submissions Allowed Per Referrer</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                      value={policyForm.maxSubmissionsPerUser}
                      onChange={(e) => setPolicyForm({ ...policyForm, maxSubmissionsPerUser: e.target.value })}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Cumulative cap per authorized portal user.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="mgmt-btn-primary"
                    disabled={saving}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Policy & DPDP Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: CENTRALIZED PARTNER MANAGEMENT                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'partners' && (
        <div className="brs-container animate-fade-in">
          {/* Stat Summary */}
          <div className="brs-stat-grid">
            <div className="brs-stat-card">
              <div className="brs-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div className="brs-stat-val">{totalPartnersCount}</div>
                <div className="brs-stat-lbl">Total Partners Across Categories</div>
              </div>
            </div>

            <div className="brs-stat-card">
              <div className="brs-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Layers size={24} />
              </div>
              <div>
                <div className="brs-stat-val">{totalProductsCount}</div>
                <div className="brs-stat-lbl">Total Approved Products / Variants</div>
              </div>
            </div>

            <div className="brs-stat-card">
              <div className="brs-stat-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="brs-stat-val">100%</div>
                <div className="brs-stat-lbl">Institutional Verification Active</div>
              </div>
            </div>
          </div>

          <div className="brs-card">
            <div className="brs-card-header">
              <div className="brs-card-title-group">
                <div className="brs-card-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Users2 size={22} />
                </div>
                <div>
                  <h2 className="brs-card-title">Centralized Partner Directory</h2>
                  <p className="brs-card-subtitle">
                    Unified overview of partner banks, underwriters, and corporate employers across all four business referral categories.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <div className="brs-search-box">
                  <Search size={15} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search all partners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => handleOpenAddPartner('Credit Card')}
                >
                  <Plus size={16} />
                  <span>Add New Partner</span>
                </button>
              </div>
            </div>

            {/* All Partners Table */}
            <div className="brs-table-wrapper">
              <table className="brs-table">
                <thead>
                  <tr>
                    <th>Partner Organization</th>
                    <th>Referral Category</th>
                    <th>Code / Acronym</th>
                    <th>Offerings Count</th>
                    <th>Website / Portal</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Quick Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {allPartnersUnified.map((p) => {
                    const avatarTheme = getPartnerAvatarStyle(p, p.parentCategory);
                    const monogram = getPartnerMonogram(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              className="brs-partner-avatar"
                              style={{ background: avatarTheme.bg, color: avatarTheme.color, borderColor: avatarTheme.border }}
                            >
                              {monogram}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.contactEmail || 'Institutional Direct Desk'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="brs-field-tag" style={{ fontWeight: 700 }}>
                            {p.parentCategory}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{p.code || '—'}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.products?.length || 0} Products</span>
                        </td>
                        <td>
                          {p.website ? (
                            <a href={p.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.8rem', textDecoration: 'none' }}>
                              <span>Visit Portal</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Internal Channel</span>
                          )}
                        </td>
                        <td>
                          <span className={`brs-status-badge ${p.isActive !== false ? 'active' : 'inactive'}`}>
                            {p.isActive !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <label className="brs-switch" title={p.isActive !== false ? 'Deactivate' : 'Activate'}>
                            <input
                              type="checkbox"
                              checked={p.isActive !== false}
                              onChange={() => handleTogglePartner(p.parentCategory, p.id)}
                            />
                            <span className="brs-slider"></span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: COMPLETE FORM FIELD MANAGEMENT                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fields' && (
        <div className="brs-container animate-fade-in">
          <div className="brs-card">
            <div className="brs-card-header">
              <div className="brs-card-title-group">
                <div className="brs-card-icon-box" style={{ background: '#faf5ff', color: '#9333ea', borderColor: '#e9d5ff' }}>
                  <SlidersHorizontal size={22} />
                </div>
                <div>
                  <h2 className="brs-card-title">Centralized Form Field Configuration</h2>
                  <p className="brs-card-subtitle">
                    Configure labels, input types, dropdown choices, required rules, and placeholders for every field in the 4 referral forms.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Category:</span>
                  <select
                    style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 0.85rem', fontSize: '0.84rem', background: '#ffffff', color: '#1e293b' }}
                    value={fieldCategoryFilter}
                    onChange={(e) => setFieldCategoryFilter(e.target.value)}
                  >
                    <option value="Credit Card">Credit Card Referral</option>
                    <option value="Insurance">Insurance Referral</option>
                    <option value="Job">Job Referral</option>
                    <option value="Bank Account">Bank Account Referral</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(configs[fieldCategoryFilter]?.fieldsConfig || []).map((field) => (
                <div key={field.fieldKey} className="brs-field-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ minWidth: '40px', textAlign: 'center' }}>
                      <span className="brs-field-tag" style={{ background: '#f1f5f9', color: '#334155' }}>
                        Step {field.step || 1}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{field.label}</span>
                        {field.isSystem && (
                          <span className="brs-field-tag system" title="System core field protected from deletion">
                            System Core
                          </span>
                        )}
                        {field.options && field.options.length > 0 && (
                          <span className="brs-field-tag dropdown" title="Configurable Dropdown Options">
                            {field.options.length} Options
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                        Field Key: <code>{field.fieldKey}</code> {field.placeholder ? `• Placeholder: "${field.placeholder}"` : ''}
                      </div>
                      {field.options && field.options.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {field.options.slice(0, 5).map((opt, oIdx) => (
                            <span key={oIdx} style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#475569' }}>
                              {opt}
                            </span>
                          ))}
                          {field.options.length > 5 && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>+{field.options.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Required Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: field.isRequired ? '#15803d' : '#64748b' }}>
                        {field.isRequired ? 'Required' : 'Optional'}
                      </span>
                      <label className="brs-switch" title={field.isSystem ? 'System fields must remain required' : 'Toggle required/optional'}>
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          disabled={field.isSystem}
                          onChange={() => handleToggleFieldRequired(fieldCategoryFilter, field.fieldKey)}
                        />
                        <span className="brs-slider" style={{ opacity: field.isSystem ? 0.6 : 1 }}></span>
                      </label>
                    </div>

                    {/* Visible Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: field.isVisible !== false ? '#2563eb' : '#dc2626' }}>
                        {field.isVisible !== false ? 'Visible' : 'Hidden'}
                      </span>
                      <label className="brs-switch" title={field.isSystem ? 'System fields cannot be hidden' : 'Toggle visible/hidden'}>
                        <input
                          type="checkbox"
                          checked={field.isVisible !== false}
                          disabled={field.isSystem}
                          onChange={() => handleToggleFieldVisible(fieldCategoryFilter, field.fieldKey)}
                        />
                        <span className="brs-slider" style={{ opacity: field.isSystem ? 0.6 : 1 }}></span>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="mgmt-btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      onClick={() => handleOpenEditField(field)}
                    >
                      <Edit size={13} />
                      <span>Edit Field</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 7: INCENTIVE CONFIGURATION                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'incentives' && (
        <div className="brs-container animate-fade-in">
          {/* Historical Safety Notice */}
          <div className="brs-notice-banner info">
            <Info size={20} />
            <div>
              <strong>Historical Rate Protection Active:</strong> Changing an incentive rule applies strictly to future referrals. Previously earned or pending referral incentives retain their originally recorded rates in the ledger.
            </div>
          </div>

          <div className="brs-card">
            <div className="brs-card-header">
              <div className="brs-card-title-group">
                <div className="brs-card-icon-box" style={{ color: '#10b981', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="brs-card-title">Incentive Rules & Reward Policies</h2>
                  <p className="brs-card-subtitle">
                    Define verified milestone triggers, qualification rules, and incentive amounts in Indian Rupees (₹) for each business referral category.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={handleOpenAddRule}
                >
                  <Plus size={16} />
                  <span>Create Incentive Rule</span>
                </button>
              </div>
            </div>

            {/* Incentive Rules Table */}
            <div className="brs-table-wrapper">
              <table className="brs-table">
                <thead>
                  <tr>
                    <th>Rule Code & Title</th>
                    <th>Category</th>
                    <th>Partner / Variant</th>
                    <th>Milestone Trigger</th>
                    <th>Incentive Rate (₹)</th>
                    <th>Effective Dates</th>
                    <th>Approval Status</th>
                    <th>Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incentiveRules.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No incentive rules created yet. Click "+ Create Incentive Rule" to set up your payout policies.
                      </td>
                    </tr>
                  ) : (
                    incentiveRules.map((rule) => (
                      <tr key={rule._id} style={{ opacity: !rule.isActive ? 0.7 : 1 }}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{rule.ruleName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rule.ruleCode}</div>
                        </td>
                        <td>
                          <span className="brs-field-tag" style={{ background: '#f1f5f9', color: '#1e293b', fontWeight: 700 }}>
                            {rule.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                            <strong>{rule.partnerName || 'All'}</strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Variant: {rule.productOrRole || 'All'}
                          </div>
                        </td>
                        <td style={{ maxWidth: '180px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                            {rule.milestone}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                            ₹{Number(rule.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          <div>From: {rule.effectiveFrom ? new Date(rule.effectiveFrom).toLocaleDateString('en-IN') : 'Immediate'}</div>
                          {rule.effectiveTo && <div>To: {new Date(rule.effectiveTo).toLocaleDateString('en-IN')}</div>}
                        </td>
                        <td>
                          <span className={`brs-status-badge ${rule.approvalStatus === 'Approved' ? 'active' : 'draft'}`}>
                            {rule.approvalStatus || 'Approved'}
                          </span>
                        </td>
                        <td>
                          <label className="brs-switch" title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}>
                            <input
                              type="checkbox"
                              checked={rule.isActive !== false}
                              onChange={async () => {
                                await updateIncentiveRule(rule._id, { isActive: !rule.isActive });
                                await fetchRules();
                              }}
                            />
                            <span className="brs-slider"></span>
                          </label>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              className="mgmt-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleOpenEditRule(rule)}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              className="mgmt-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteRule(rule._id, rule.ruleName)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 8: REFERRAL RULES AND ELIGIBILITY                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div className="brs-container animate-fade-in">
          {['Credit Card', 'Insurance', 'Job', 'Bank Account'].map((cat) => {
            const cfg = configs[cat];
            return (
              <div key={cat} className="brs-card">
                <div className="brs-card-header">
                  <div className="brs-card-title-group">
                    <div className="brs-card-icon-box" style={{ background: '#f8fafc', color: '#0f172a' }}>
                      <Scale size={22} />
                    </div>
                    <div>
                      <h3 className="brs-card-title">{cat} Governance & Eligibility Terms</h3>
                      <p className="brs-card-subtitle">
                        Notice version: <code>{cfg?.generalSettings?.consentNoticeVersion || 'v1.0'}</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div className="brs-form-group">
                    <label>Candidate / Applicant Consent Verification Text</label>
                    <textarea
                      rows={3}
                      value={cfg?.generalSettings?.consentText || ''}
                      onChange={(e) => {
                        const newGen = { ...cfg?.generalSettings, consentText: e.target.value };
                        setConfigs({ ...configs, [cat]: { ...cfg, generalSettings: newGen } });
                      }}
                    />
                  </div>

                  <div className="brs-form-group">
                    <label>Verified Partner Submission Notice</label>
                    <textarea
                      rows={3}
                      value={cfg?.generalSettings?.submissionNotice || ''}
                      onChange={(e) => {
                        const newGen = { ...cfg?.generalSettings, submissionNotice: e.target.value };
                        setConfigs({ ...configs, [cat]: { ...cfg, generalSettings: newGen } });
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="mgmt-btn-primary"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        setSaving(true);
                        await updateReferralPolicy(cat, { generalSettings: cfg?.generalSettings });
                        setFeedback({ type: 'success', message: `${cat} terms saved to database.` });
                      } catch (err) {
                        setFeedback({ type: 'error', message: err.message });
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <Save size={15} />
                    <span>Save {cat} Terms</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 9: CONFIGURATION HISTORY                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="brs-container animate-fade-in">
          <div className="brs-card">
            <div className="brs-card-header">
              <div className="brs-card-title-group">
                <div className="brs-card-icon-box" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <History size={22} />
                </div>
                <div>
                  <h2 className="brs-card-title">Configuration Audit Trail & History</h2>
                  <p className="brs-card-subtitle">
                    Permanent audit record of partner modifications, product additions, field updates, and incentive rate changes.
                  </p>
                </div>
              </div>

              <div className="brs-card-actions">
                <select
                  style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 0.85rem', fontSize: '0.84rem', background: '#ffffff', color: '#1e293b' }}
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Job">Job Referral</option>
                  <option value="Bank Account">Bank Account</option>
                </select>

                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  onClick={fetchHistory}
                >
                  <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                  <span>Refresh Log</span>
                </button>
              </div>
            </div>

            <div className="brs-table-wrapper">
              <table className="brs-table">
                <thead>
                  <tr>
                    <th>Timestamp (IST)</th>
                    <th>Administrator</th>
                    <th>Category</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No configuration audit logs recorded yet. Changes will be logged here automatically.
                      </td>
                    </tr>
                  ) : (
                    auditHistory.map((log) => (
                      <tr key={log._id}>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{log.performedBy || 'Super Admin'}</strong>
                        </td>
                        <td>
                          <span className="brs-field-tag">{log.category}</span>
                        </td>
                        <td>
                          <span className="brs-field-tag" style={{ background: '#ede9fe', color: '#6b21a8', fontWeight: 700 }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#334155' }}>
                          <div><strong>{log.title}</strong></div>
                          {log.details && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{log.details}</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT PARTNER                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddPartnerModal && (
        <div className="brs-modal-overlay">
          <div className="brs-modal animate-scale-up">
            <div className="brs-modal-header">
              <h3>{editingPartner ? `Edit Partner: ${editingPartner.name}` : `Add New Partner`}</h3>
              <button className="brs-modal-close-btn" onClick={() => setShowAddPartnerModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePartner}>
              <div className="brs-modal-body">
                {activeTab === 'partners' && (
                  <div className="brs-form-group">
                    <label>Referral Category *</label>
                    <select
                      value={partnerForm.category}
                      onChange={(e) => setPartnerForm({ ...partnerForm, category: e.target.value })}
                    >
                      <option value="Credit Card">Credit Card Referral</option>
                      <option value="Insurance">Insurance Referral</option>
                      <option value="Job">Job Referral</option>
                      <option value="Bank Account">Bank Account Referral</option>
                    </select>
                  </div>
                )}

                <div className="brs-form-group">
                  <label>Partner / Institution Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, Star Health, Tata Consultancy Services"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  />
                  <span className="brs-form-help">Must be unique across institutional records.</span>
                </div>

                <div className="brs-form-group">
                  <label>Partner Short Code / Acronym (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC, STAR, TCS, SBI"
                    value={partnerForm.code}
                    onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Sector / Sub-Category (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Retail Banking, Health Insurance, IT Services"
                    value={partnerForm.category}
                    onChange={(e) => setPartnerForm({ ...partnerForm, category: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Official Portal / Partner Website (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={partnerForm.website}
                    onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Partner Contact / Nodal Desk Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="partner-desk@example.com"
                    value={partnerForm.contactEmail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="brs-modal-footer">
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  onClick={() => setShowAddPartnerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgmt-btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingPartner ? 'Update Partner' : 'Create Partner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT PRODUCT                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddProductModal && (
        <div className="brs-modal-overlay">
          <div className="brs-modal animate-scale-up">
            <div className="brs-modal-header">
              <h3>
                {editingProduct ? `Edit Offering: ${editingProduct.name}` : `Add New Product / Offering (${currentCategoryName})`}
              </h3>
              <button className="brs-modal-close-btn" onClick={() => setShowAddProductModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="brs-modal-body">
                <div className="brs-form-group">
                  <label>Associated Partner *</label>
                  <select
                    required
                    disabled={Boolean(editingProduct)}
                    value={productForm.partnerId}
                    onChange={(e) => setProductForm({ ...productForm, partnerId: e.target.value })}
                  >
                    <option value="">-- Select Partner --</option>
                    {(currentConfig?.partners || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="brs-form-group">
                  <label>
                    {activeTab === 'credit-card' && 'Credit Card / Variant Name *'}
                    {activeTab === 'insurance' && 'Insurance Policy Name *'}
                    {activeTab === 'job-referral' && 'Job Title / Role Name *'}
                    {activeTab === 'account-opening' && 'Account Variant / Offering Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Millennia Cashback Credit Card"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Sub-Category *</label>
                  {currentConfig?.categoriesList && currentConfig.categoriesList.length > 0 ? (
                    <select
                      value={productForm.productCategory}
                      onChange={(e) => setProductForm({ ...productForm, productCategory: e.target.value })}
                    >
                      {currentConfig.categoriesList.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Cashback, Health, Savings"
                      value={productForm.productCategory}
                      onChange={(e) => setProductForm({ ...productForm, productCategory: e.target.value })}
                    />
                  )}
                </div>

                <div className="brs-form-group">
                  <label>Eligibility Conditions (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Min monthly income ₹25,000. Age 21-60. Valid PAN & Aadhaar."
                    value={productForm.eligibilityConditions}
                    onChange={(e) => setProductForm({ ...productForm, eligibilityConditions: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Required Documents (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. PAN Card, Aadhaar Card, Salary Slip"
                    value={productForm.requiredDocuments}
                    onChange={(e) => setProductForm({ ...productForm, requiredDocuments: e.target.value })}
                  />
                </div>

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Annual Fee / CTC / Deposit</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹500 / Lifetime Free"
                      value={productForm.annualFee}
                      onChange={(e) => setProductForm({ ...productForm, annualFee: e.target.value })}
                    />
                  </div>

                  <div className="brs-form-group">
                    <label>Turnaround Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 2-3 business days"
                      value={productForm.turnaroundTime}
                      onChange={(e) => setProductForm({ ...productForm, turnaroundTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="brs-modal-footer">
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  onClick={() => setShowAddProductModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgmt-btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT FORM FIELD (9 TYPES & VALIDATION)                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showEditFieldModal && (
        <div className="brs-modal-overlay">
          <div className="brs-modal animate-scale-up" style={{ maxWidth: '640px' }}>
            <div className="brs-modal-header">
              <h3>{editingField ? `Edit Field: ${fieldForm.label || fieldForm.fieldKey}` : 'Create New Form Field'}</h3>
              <button className="brs-modal-close-btn" onClick={() => setShowEditFieldModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFieldForm}>
              <div className="brs-modal-body">
                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Field Display Label *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Household Income"
                      value={fieldForm.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        const update = { ...fieldForm, label: newLabel };
                        if (!editingField && !fieldForm.fieldKey) {
                          update.fieldKey = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
                        }
                        setFieldForm(update);
                      }}
                    />
                  </div>

                  <div className="brs-form-group">
                    <label>Field Identifier Key *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingField}
                      placeholder="e.g. annual_household_income"
                      value={fieldForm.fieldKey}
                      onChange={(e) => setFieldForm({ ...fieldForm, fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    />
                    <span className="brs-form-help">Unique JSON key for backend database storage.</span>
                  </div>
                </div>

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Input Field Type *</label>
                    <select
                      value={fieldForm.fieldType}
                      onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })}
                    >
                      <option value="text">Single-line Text (text)</option>
                      <option value="number">Numeric Input (number)</option>
                      <option value="email">Email Address (email)</option>
                      <option value="phone">Phone / Mobile (phone)</option>
                      <option value="dropdown">Dropdown Select (dropdown)</option>
                      <option value="radio">Radio Buttons (radio)</option>
                      <option value="checkbox">Checkbox / Multi-select (checkbox)</option>
                      <option value="date">Date Picker (date)</option>
                      <option value="textarea">Multi-line Text Area (textarea)</option>
                    </select>
                  </div>

                  <div className="brs-form-group">
                    <label>Wizard Step Position *</label>
                    <select
                      value={fieldForm.step}
                      onChange={(e) => setFieldForm({ ...fieldForm, step: Number(e.target.value) })}
                    >
                      <option value={1}>Step 1: Applicant Information</option>
                      <option value={2}>Step 2: Referral & Partner Details</option>
                      <option value={3}>Step 3: Consent & Declaration</option>
                    </select>
                  </div>
                </div>

                <div className="brs-form-group">
                  <label>Field Description / Helper Text</label>
                  <input
                    type="text"
                    placeholder="e.g. As per your latest Income Tax Return or Salary Slip"
                    value={fieldForm.description}
                    onChange={(e) => setFieldForm({ ...fieldForm, description: e.target.value })}
                  />
                  <span className="brs-form-help">Displayed directly beneath the label to guide applicants.</span>
                </div>

                <div className="brs-form-group">
                  <label>Input Placeholder Hint</label>
                  <input
                    type="text"
                    placeholder="e.g. Enter amount in ₹ or Select an option..."
                    value={fieldForm.placeholder}
                    onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                  />
                </div>

                {['dropdown', 'radio', 'checkbox'].includes(fieldForm.fieldType) && (
                  <div className="brs-options-box">
                    <div className="brs-options-header">
                      <div className="brs-options-header-title">
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                          Dropdown Select Options *
                        </span>
                        <span className="brs-options-count-badge">
                          {(fieldForm.options || []).length} {(fieldForm.options || []).length === 1 ? 'Option' : 'Options'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {currentConfig?.partners?.length > 0 && (
                          <button
                            type="button"
                            className="brs-opt-action-btn import"
                            onClick={handleImportCurrentPartners}
                            title="Quick import active partners configured in this category"
                          >
                            <Sparkles size={13} />
                            <span>Import Active Partners</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="brs-opt-action-btn"
                          onClick={() => setFieldForm(prev => ({
                            ...prev,
                            optionsMode: prev.optionsMode === 'csv' ? 'list' : 'csv'
                          }))}
                        >
                          {fieldForm.optionsMode === 'csv' ? 'Interactive List View' : 'Bulk CSV Mode'}
                        </button>
                      </div>
                    </div>

                    {fieldForm.optionsMode === 'csv' ? (
                      /* CSV Bulk Mode */
                      <div style={{ marginTop: '10px' }}>
                        <textarea
                          rows={4}
                          className="brs-options-csv-area"
                          placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India, Axis Bank"
                          value={fieldForm.optionsString}
                          onChange={(e) => handleSyncOptionsFromCsv(e.target.value)}
                        />
                        <span className="brs-form-help" style={{ display: 'block', marginTop: '4px' }}>
                          Enter choices separated by commas. Changes instantly update the interactive option list.
                        </span>
                      </div>
                    ) : (
                      /* Interactive List Mode */
                      <div style={{ marginTop: '10px' }}>
                        {/* Add Option Input Row */}
                        <div className="brs-option-add-row">
                          <input
                            type="text"
                            placeholder="Type new option name (e.g. HDFC Bank, Salaried, IT Specialist)..."
                            value={fieldForm.newOptionInput || ''}
                            onChange={(e) => setFieldForm({ ...fieldForm, newOptionInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOptionToField();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="mgmt-btn-primary"
                            style={{ padding: '0 16px', height: '38px', flexShrink: 0 }}
                            onClick={() => handleAddOptionToField()}
                            disabled={!(fieldForm.newOptionInput || '').trim()}
                          >
                            <Plus size={15} />
                            <span>Add Option</span>
                          </button>
                        </div>

                        {/* Options List */}
                        {(!fieldForm.options || fieldForm.options.length === 0) ? (
                          <div className="brs-options-empty-box">
                            <AlertCircle size={22} color="#94a3b8" />
                            <p style={{ margin: '6px 0 2px 0', fontWeight: 600, color: '#475569', fontSize: '0.84rem' }}>
                              No dropdown options added yet
                            </p>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              Add options individually above or click "Import Active Partners".
                            </span>
                          </div>
                        ) : (
                          <div className="brs-options-item-list">
                            {fieldForm.options.map((opt, idx) => (
                              <div key={idx} className="brs-option-item-row">
                                <div className="brs-option-item-left">
                                  <span className="brs-option-idx-badge">{idx + 1}</span>
                                  {fieldForm.editingOptionIndex === idx ? (
                                    <input
                                      type="text"
                                      className="brs-option-inline-edit"
                                      autoFocus
                                      value={fieldForm.editingOptionText}
                                      onChange={(e) => setFieldForm({ ...fieldForm, editingOptionText: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveOptionEdit(idx);
                                        } else if (e.key === 'Escape') {
                                          handleCancelOptionEdit();
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span
                                      className="brs-option-item-text"
                                      onDoubleClick={() => handleStartEditOption(idx)}
                                      title="Double-click to edit"
                                    >
                                      {opt}
                                    </span>
                                  )}
                                </div>

                                <div className="brs-option-item-actions">
                                  {fieldForm.editingOptionIndex === idx ? (
                                    <>
                                      <button
                                        type="button"
                                        className="brs-opt-btn check"
                                        onClick={() => handleSaveOptionEdit(idx)}
                                        title="Save option"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="brs-opt-btn cancel"
                                        onClick={handleCancelOptionEdit}
                                        title="Cancel editing"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="brs-opt-btn"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveOptionInField(idx, 'up')}
                                        title="Move option up"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="brs-opt-btn"
                                        disabled={idx === fieldForm.options.length - 1}
                                        onClick={() => handleMoveOptionInField(idx, 'down')}
                                        title="Move option down"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="brs-opt-btn"
                                        onClick={() => handleStartEditOption(idx)}
                                        title="Edit this option"
                                      >
                                        <Edit size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="brs-opt-btn delete"
                                        onClick={() => handleDeleteOptionFromField(idx)}
                                        title="Remove option"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Validation Rule</label>
                    <select
                      value={fieldForm.validationRule}
                      onChange={(e) => setFieldForm({ ...fieldForm, validationRule: e.target.value })}
                    >
                      <option value="none">No Specific Format Validation</option>
                      <option value="phone">10-Digit Indian Mobile Number</option>
                      <option value="email">Standard Email Address</option>
                      <option value="number">Positive Numeric Value</option>
                      <option value="pan">PAN Card Format (ABCDE1234F)</option>
                      <option value="aadhaar">12-Digit Aadhaar Number</option>
                      <option value="pincode">6-Digit Indian Postal PIN</option>
                    </select>
                  </div>

                  <div className="brs-form-group">
                    <label>Custom Error Message (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Please enter a valid 10-digit mobile number"
                      value={fieldForm.errorMessage}
                      onChange={(e) => setFieldForm({ ...fieldForm, errorMessage: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', padding: '12px 0', borderTop: '1px solid #f1f5f9', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(fieldForm.isRequired)}
                      onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      Mark as Required Field (Applicant must fill this)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={fieldForm.isVisible !== false}
                      onChange={(e) => setFieldForm({ ...fieldForm, isVisible: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      Visible in Live Referral Form
                    </span>
                  </label>
                </div>
              </div>

              <div className="brs-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {editingField && (
                    <button
                      type="button"
                      className="mgmt-btn-secondary"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={async () => {
                        const catName = activeTab === 'fields' ? fieldCategoryFilter : currentCategoryName;
                        setShowEditFieldModal(false);
                        await handleDeleteField(catName, editingField.fieldKey);
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Delete This Field</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="mgmt-btn-secondary"
                    onClick={() => setShowEditFieldModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="mgmt-btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (editingField ? 'Update Field' : 'Create Field')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: LIVE FORM BUILDER PREVIEW                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <FormBuilderPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        config={currentConfig}
        category={currentCategoryName}
      />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT INCENTIVE RULE                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddRuleModal && (
        <div className="brs-modal-overlay">
          <div className="brs-modal animate-scale-up">
            <div className="brs-modal-header">
              <h3>{editingRule ? `Edit Incentive Rule: ${editingRule.ruleName}` : 'Create New Incentive Rule'}</h3>
              <button className="brs-modal-close-btn" onClick={() => setShowAddRuleModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRule}>
              <div className="brs-modal-body">
                <div className="brs-form-group">
                  <label>Rule Title / Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Credit Card Activation Incentive"
                    value={ruleForm.ruleName}
                    onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  />
                </div>

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Referral Category *</label>
                    <select
                      value={ruleForm.category}
                      onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                    >
                      <option value="Credit Card">Credit Card Referral</option>
                      <option value="Insurance">Insurance Referral</option>
                      <option value="Job">Job Referral</option>
                      <option value="Bank Account">Bank Account / Banking</option>
                    </select>
                  </div>

                  <div className="brs-form-group">
                    <label>Incentive Amount (₹ Indian Rupees) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={10}
                      placeholder="e.g. 750"
                      value={ruleForm.amount}
                      onChange={(e) => setRuleForm({ ...ruleForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Applicable Partner (Optional)</label>
                    <input
                      type="text"
                      placeholder="All or specific bank/partner name"
                      value={ruleForm.partnerName}
                      onChange={(e) => setRuleForm({ ...ruleForm, partnerName: e.target.value })}
                    />
                  </div>

                  <div className="brs-form-group">
                    <label>Applicable Product/Role (Optional)</label>
                    <input
                      type="text"
                      placeholder="All or specific variant"
                      value={ruleForm.productOrRole}
                      onChange={(e) => setRuleForm({ ...ruleForm, productOrRole: e.target.value })}
                    />
                  </div>
                </div>

                <div className="brs-form-group">
                  <label>Milestone Verification Trigger *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Card dispatch confirmation / Policy Issued / Account allocated"
                    value={ruleForm.milestone}
                    onChange={(e) => setRuleForm({ ...ruleForm, milestone: e.target.value })}
                  />
                </div>

                <div className="brs-form-group">
                  <label>Eligibility & Verification Conditions</label>
                  <textarea
                    rows={2}
                    placeholder="Specific qualification rules required before reward disbursement..."
                    value={ruleForm.eligibilityConditions}
                    onChange={(e) => setRuleForm({ ...ruleForm, eligibilityConditions: e.target.value })}
                  />
                </div>

                <div className="brs-modal-grid-2">
                  <div className="brs-form-group">
                    <label>Effective From Date</label>
                    <input
                      type="date"
                      value={ruleForm.effectiveFrom}
                      onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
                    />
                  </div>

                  <div className="brs-form-group">
                    <label>Effective To Date (Optional)</label>
                    <input
                      type="date"
                      value={ruleForm.effectiveTo}
                      onChange={(e) => setRuleForm({ ...ruleForm, effectiveTo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="brs-form-group">
                  <label>Approval Requirement</label>
                  <select
                    value={ruleForm.approvalStatus}
                    onChange={(e) => setRuleForm({ ...ruleForm, approvalStatus: e.target.value })}
                  >
                    <option value="Approved">Approved (Ready for live referral incentives)</option>
                    <option value="Draft">Draft (Hold until institutional review)</option>
                  </select>
                </div>
              </div>

              <div className="brs-modal-footer">
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  onClick={() => setShowAddRuleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgmt-btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
