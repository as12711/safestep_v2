/**
 * Admin Dashboard Screen
 * ======================
 * Report approval workflow and moderation interface.
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import { COLORS } from '../theme/colors';
import { supabase } from '../services/supabase';

// Report type configurations
const REPORT_TYPE_CONFIG = {
  hazard: { icon: '⚠️', label: 'Hazard', color: COLORS.danger },
  police: { icon: '👮', label: 'Police', color: COLORS.blue },
  security: { icon: '🛡️', label: 'Security', color: COLORS.safe },
  closed: { icon: '🚫', label: 'Path Closed', color: COLORS.danger },
  construction: { icon: '🚧', label: 'Construction', color: COLORS.warn },
  dark: { icon: '🌑', label: 'Dark Area', color: COLORS.text3 },
  lit: { icon: '💡', label: 'Well Lit', color: COLORS.safe },
  crowd: { icon: '👥', label: 'Crowded', color: COLORS.safe },
  quiet: { icon: '🔇', label: 'Quiet Area', color: COLORS.text3 },
};

/**
 * Report Card Component
 */
const ReportCard = memo(({ report, onApprove, onDeny, isProcessing }) => {
  const config = REPORT_TYPE_CONFIG[report.type] || { icon: '📍', label: report.type, color: COLORS.text2 };
  const timeAgo = useMemo(() => {
    const diff = Date.now() - report.ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [report.ts]);

  const verificationProgress = (report.verification_count || 0) / (report.verification_threshold || 3);

  return (
    <View style={styles.reportCard}>
      {/* Header */}
      <View style={styles.reportHeader}>
        <View style={[styles.typeIconContainer, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.typeIcon}>{config.icon}</Text>
        </View>
        <View style={styles.reportMeta}>
          <Text style={styles.reportType}>{config.label}</Text>
          <Text style={styles.reportTime}>{timeAgo}</Text>
        </View>
        {report.priority > 5 && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>HIGH</Text>
          </View>
        )}
      </View>

      {/* Location */}
      <Text style={styles.reportLocation}>
        📍 {report.lat?.toFixed(5)}, {report.lng?.toFixed(5)}
      </Text>

      {/* Description */}
      {report.description && (
        <Text style={styles.reportDescription}>{report.description}</Text>
      )}

      {/* Photo */}
      {report.photo_uri && (
        <Image
          source={{ uri: report.photo_uri }}
          style={styles.reportPhoto}
          resizeMode="cover"
        />
      )}

      {/* Verification Progress */}
      <View style={styles.verificationSection}>
        <Text style={styles.verificationLabel}>
          Community Verification: {report.verification_count || 0}/{report.verification_threshold || 3}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${verificationProgress * 100}%` }]} />
        </View>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userLabel}>
          Reported by: {report.user_id === 'anonymous' ? 'Anonymous' : report.user_id?.slice(0, 8)}
        </Text>
        {report.is_ambient && (
          <View style={styles.ambientBadge}>
            <Text style={styles.ambientText}>Ambient</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.reportActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.denyButton]}
          onPress={() => onDeny(report)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <Text style={styles.actionButtonText}>✕ Deny</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => onApprove(report)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.textInverse} size="small" />
          ) : (
            <Text style={[styles.actionButtonText, styles.approveButtonText]}>✓ Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

ReportCard.displayName = 'ReportCard';

/**
 * Stats Card
 */
const StatsCard = memo(({ icon, label, value, color }) => (
  <View style={styles.statsCard}>
    <Text style={styles.statsIcon}>{icon}</Text>
    <Text style={[styles.statsValue, { color }]}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </View>
));

StatsCard.displayName = 'StatsCard';

/**
 * Filter Tabs
 */
const FilterTabs = memo(({ activeFilter, onFilterChange, counts }) => (
  <View style={styles.filterTabs}>
    {['pending', 'approved', 'denied'].map((filter) => (
      <TouchableOpacity
        key={filter}
        style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
        onPress={() => onFilterChange(filter)}
      >
        <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </Text>
        {counts[filter] > 0 && (
          <View style={[styles.filterBadge, activeFilter === filter && styles.filterBadgeActive]}>
            <Text style={styles.filterBadgeText}>{counts[filter]}</Text>
          </View>
        )}
      </TouchableOpacity>
    ))}
  </View>
));

FilterTabs.displayName = 'FilterTabs';

/**
 * Admin Dashboard Main Component
 */
const AdminDashboard = memo(({ onClose }) => {
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0,
    total: 0,
  });

  /**
   * Fetch reports from Supabase
   */
  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase.getPendingReports(activeFilter);
      
      if (error) {
        console.error('[AdminDashboard] Fetch error:', error);
        return;
      }

      setReports(data || []);
    } catch (e) {
      console.error('[AdminDashboard] Fetch error:', e);
    }
  }, [activeFilter]);

  /**
   * Fetch stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const [pending, approved, denied] = await Promise.all([
        supabase.getPendingReports('pending'),
        supabase.getPendingReports('approved'),
        supabase.getPendingReports('denied'),
      ]);

      setStats({
        pending: pending.data?.length || 0,
        approved: approved.data?.length || 0,
        denied: denied.data?.length || 0,
        total: (pending.data?.length || 0) + (approved.data?.length || 0) + (denied.data?.length || 0),
      });
    } catch (e) {
      console.error('[AdminDashboard] Stats error:', e);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchReports(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [activeFilter]);

  /**
   * Refresh handler
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchReports(), fetchStats()]);
    setRefreshing(false);
  }, [fetchReports, fetchStats]);

  /**
   * Approve report
   */
  const handleApprove = useCallback(async (report) => {
    setProcessingId(report.id);
    
    try {
      const { data, error } = await supabase.adminReviewReport(report.id, 'approve');
      
      if (error) {
        Alert.alert('Error', 'Failed to approve report. Please try again.');
        return;
      }

      // Remove from list
      setReports(prev => prev.filter(r => r.id !== report.id));
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1,
      }));

    } catch (e) {
      Alert.alert('Error', 'Failed to approve report. Please try again.');
    } finally {
      setProcessingId(null);
    }
  }, []);

  /**
   * Deny report
   */
  const handleDeny = useCallback((report) => {
    Alert.alert(
      'Deny Report',
      'Please select a reason for denying this report:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inaccurate', onPress: () => denyWithReason(report, 'inaccurate') },
        { text: 'Duplicate', onPress: () => denyWithReason(report, 'duplicate') },
        { text: 'Spam', onPress: () => denyWithReason(report, 'spam') },
        { text: 'Other', onPress: () => denyWithReason(report, 'other') },
      ]
    );
  }, []);

  const denyWithReason = async (report, reason) => {
    setProcessingId(report.id);
    
    try {
      const { error } = await supabase.adminReviewReport(report.id, 'deny', reason);
      
      if (error) {
        Alert.alert('Error', 'Failed to deny report. Please try again.');
        return;
      }

      setReports(prev => prev.filter(r => r.id !== report.id));
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        denied: prev.denied + 1,
      }));

    } catch (e) {
      Alert.alert('Error', 'Failed to deny report. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Render report item
   */
  const renderReport = useCallback(({ item }) => (
    <ReportCard
      report={item}
      onApprove={handleApprove}
      onDeny={handleDeny}
      isProcessing={processingId === item.id}
    />
  ), [handleApprove, handleDeny, processingId]);

  /**
   * Empty state
   */
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {activeFilter === 'pending' ? '✅' : activeFilter === 'approved' ? '📋' : '🗑️'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeFilter === 'pending' 
          ? 'All caught up!' 
          : `No ${activeFilter} reports`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'pending' 
          ? 'No pending reports to review.' 
          : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} reports will appear here.`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <StatsCard icon="📥" label="Pending" value={stats.pending} color={COLORS.warn} />
        <StatsCard icon="✅" label="Approved" value={stats.approved} color={COLORS.safe} />
        <StatsCard icon="❌" label="Denied" value={stats.denied} color={COLORS.danger} />
        <StatsCard icon="📊" label="Total" value={stats.total} color={COLORS.primary} />
      </ScrollView>

      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={stats}
      />

      {/* Reports List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  statsContainer: {
    maxHeight: 100,
    backgroundColor: COLORS.surface,
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statsCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
    marginRight: 12,
  },
  statsIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.text3,
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryDim,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.text3,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.primary,
  },
  filterBadge: {
    backgroundColor: COLORS.text3,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadgeText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text3,
    marginTop: 12,
  },
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  reportMeta: {
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  reportTime: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  priorityBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportLocation: {
    fontSize: 12,
    color: COLORS.text3,
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: COLORS.text2,
    marginBottom: 12,
    lineHeight: 20,
  },
  reportPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface2,
  },
  verificationSection: {
    marginBottom: 12,
  },
  verificationLabel: {
    fontSize: 12,
    color: COLORS.text3,
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 3,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.safe,
    borderRadius: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  userLabel: {
    fontSize: 12,
    color: COLORS.text3,
  },
  ambientBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ambientText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyButton: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  approveButton: {
    backgroundColor: COLORS.safe,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  approveButtonText: {
    color: COLORS.textInverse,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text3,
    textAlign: 'center',
  },
});

export default AdminDashboard;
