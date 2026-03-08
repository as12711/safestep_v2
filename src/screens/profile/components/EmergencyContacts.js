/**
 * EmergencyContacts
 * ==================
 * Manage emergency contacts for SOS and auto-share features.
 * Critical safety feature with prominent visibility.
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;

// Demo contacts
const DEMO_CONTACTS = [
  {
    id: '1',
    name: 'Mom',
    phone: '+1 (555) 123-4567',
    relationship: 'Family',
    isPrimary: true,
  },
  {
    id: '2',
    name: 'Jake',
    phone: '+1 (555) 987-6543',
    relationship: 'Friend',
    isPrimary: false,
  },
];

// Individual contact card
const ContactCard = memo(({
  contact,
  onEdit,
  onDelete,
  onSetPrimary,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      contact.name,
      'What would you like to do?',
      [
        {
          text: 'Set as Primary',
          onPress: () => onSetPrimary?.(contact.id),
        },
        {
          text: 'Edit',
          onPress: () => onEdit?.(contact),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(contact.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [contact, onEdit, onDelete, onSetPrimary]);

  // Get initials
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get relationship color
  const getRelationshipColor = (relationship) => {
    switch (relationship.toLowerCase()) {
      case 'family': return colors.safety.safe;
      case 'friend': return colors.community.primary;
      case 'partner': return colors.feature.pinkLight;
      default: return colors.text.secondary;
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.contactCard,
          contact.isPrimary && styles.contactCardPrimary,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Primary badge */}
        {contact.isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
          </View>
        )}

        {/* Avatar */}
        <View style={[
          styles.contactAvatar,
          { backgroundColor: getRelationshipColor(contact.relationship) + '30' },
        ]}>
          <Text style={[
            styles.contactInitials,
            { color: getRelationshipColor(contact.relationship) },
          ]}>
            {getInitials(contact.name)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>

        {/* Relationship tag */}
        <View style={[
          styles.relationshipTag,
          { backgroundColor: getRelationshipColor(contact.relationship) + '20' },
        ]}>
          <Text style={[
            styles.relationshipText,
            { color: getRelationshipColor(contact.relationship) },
          ]}>
            {contact.relationship}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Add contact button
const AddContactButton = memo(({ onPress }) => (
  <TouchableOpacity
    style={styles.addButton}
    onPress={() => {
      Haptics.selectionAsync();
      onPress?.();
    }}
  >
    <View style={styles.addIconContainer}>
      <Text style={styles.addIcon}>+</Text>
    </View>
    <Text style={styles.addLabel}>Add Emergency Contact</Text>
  </TouchableOpacity>
));

const EmergencyContacts = memo(() => {
  const [contacts, setContacts] = useState(DEMO_CONTACTS);

  const handleAddContact = useCallback(() => {
    Alert.alert('Add Contact', 'This would open a contact picker or form.');
  }, []);

  const handleEditContact = useCallback((contact) => {
    Alert.alert('Edit Contact', `Editing ${contact.name}`);
  }, []);

  const handleDeleteContact = useCallback((contactId) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setContacts(prev => prev.filter(c => c.id !== contactId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, []);

  const handleSetPrimary = useCallback((contactId) => {
    setContacts(prev => prev.map(c => ({
      ...c,
      isPrimary: c.id === contactId,
    })));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.container}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <LinearGradient
          colors={[colors.safety.alertMuted, colors.bg.tertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.infoBannerGradient}
        >
          <Text style={styles.infoIcon}>🚨</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>SOS Contacts</Text>
            <Text style={styles.infoDescription}>
              These contacts will be notified when you trigger SOS or if you don't check in.
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Contact list */}
      <View style={styles.contactList}>
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onSetPrimary={handleSetPrimary}
          />
        ))}

        {/* Add button */}
        {contacts.length < 5 && (
          <AddContactButton onPress={handleAddContact} />
        )}
      </View>

      {/* Capacity indicator */}
      <Text style={styles.capacityText}>
        {contacts.length}/5 contacts added
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  // Info banner
  infoBanner: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },

  infoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.safety.alert + '30',
    borderRadius: radius.xl,
  },

  infoIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: 2,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    ...typography.labelMedium,
    color: colors.safety.alert,
    fontWeight: '600',
    marginBottom: 2,
  },

  infoDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Contact list
  contactList: {
    gap: spacing.sm,
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  contactCardPrimary: {
    borderColor: colors.safety.safe + '50',
    backgroundColor: colors.safety.safeMuted + '30',
  },

  primaryBadge: {
    position: 'absolute',
    top: -1,
    right: spacing.md,
    backgroundColor: colors.safety.safe,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  primaryBadgeText: {
    ...typography.labelSmall,
    color: colors.bg.primary,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },

  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  contactInitials: {
    ...typography.titleMedium,
    fontWeight: '700',
  },

  contactInfo: {
    flex: 1,
  },

  contactName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },

  contactPhone: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  relationshipTag: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  relationshipText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.ui.border,
    borderStyle: 'dashed',
  },

  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  addIcon: {
    fontSize: 18,
    color: colors.text.secondary,
  },

  addLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  // Capacity
  capacityText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

ContactCard.displayName = 'ContactCard';
AddContactButton.displayName = 'AddContactButton';
EmergencyContacts.displayName = 'EmergencyContacts';

export default EmergencyContacts;
