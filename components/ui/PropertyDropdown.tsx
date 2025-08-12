import { LuxuryColors } from '@/constants/Colors';
import { ApiService, ListingData } from '@/services/api';
import { SecureStorageService, SelectedProperty } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';

interface PropertyDropdownProps {
  onPropertySelect?: (property: SelectedProperty) => void;
  style?: any;
}

export default function PropertyDropdown({ onPropertySelect, style }: PropertyDropdownProps) {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<SelectedProperty | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check if a property is already selected
      const saved = await SecureStorageService.getSelectedProperty();
      if (saved) {
        setSelectedProperty(saved);
      }
      
      // Load listings
      await loadListings();
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
    } finally {
      setInitialLoad(false);
    }
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await ApiService.fetchListings();
      setListings(response.listings.filter(listing => !listing.isHidden));
      
      // If no property is selected but listings are available, auto-select the first one
      if (!selectedProperty && response.listings.length > 0) {
        const firstProperty = response.listings[0];
        const propertyToSelect: SelectedProperty = {
          id: firstProperty.id,
          name: firstProperty.name,
          location: `${firstProperty.city_name}, ${firstProperty.state}`,
          no_of_bedrooms: firstProperty.no_of_bedrooms,
          selectedAt: new Date().toISOString(),
        };
        
        await selectProperty(propertyToSelect);
      }
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      Alert.alert(
        'Unable to Load Properties',
        'Please check your API configuration in Settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const selectProperty = async (property: SelectedProperty) => {
    try {
      setSelectedProperty(property);
      await SecureStorageService.storeSelectedProperty(property);
      onPropertySelect?.(property);
      setModalVisible(false);
      console.log(`✅ Property selected: ${property.name} (${property.no_of_bedrooms} bedrooms)`);
    } catch (error) {
      console.error('❌ Error selecting property:', error);
      Alert.alert('Error', 'Failed to select property. Please try again.');
    }
  };

  const handlePropertySelect = (listing: ListingData) => {
    const property: SelectedProperty = {
      id: listing.id,
      name: listing.name,
      location: `${listing.city_name}, ${listing.state}`,
      no_of_bedrooms: listing.no_of_bedrooms,
      selectedAt: new Date().toISOString(),
    };
    
    selectProperty(property);
  };

  const renderPropertyItem = ({ item }: { item: ListingData }) => (
    <TouchableOpacity
      style={{
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: LuxuryColors.border + '20',
      }}
      onPress={() => handlePropertySelect(item)}
      activeOpacity={0.7}
    >
      <Text style={{
        fontSize: 16,
        fontWeight: '600',
        color: LuxuryColors.text,
        marginBottom: 4,
      }} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{
        fontSize: 13,
        color: LuxuryColors.textSecondary,
        marginBottom: 2,
      }}>
        {item.city_name}, {item.state}
      </Text>
      <Text style={{
        fontSize: 12,
        color: LuxuryColors.textLight,
      }}>
        {item.no_of_bedrooms} bedroom{item.no_of_bedrooms !== 1 ? 's' : ''} • {item.pms}
      </Text>
    </TouchableOpacity>
  );

  if (initialLoad) {
    return (
      <View style={[{
        flexDirection: 'row',
        alignItems: 'center',
      }, style]}>
        <ActivityIndicator size="small" color={LuxuryColors.textLight} />
        <Text style={{
          marginLeft: 8,
          fontSize: 13,
          color: LuxuryColors.textLight,
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!selectedProperty) {
    return (
      <TouchableOpacity
        style={[{
          flexDirection: 'row',
          alignItems: 'center',
        }, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={{
          fontSize: 13,
          color: LuxuryColors.textSecondary,
        }}>
          Select Property
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={14} 
          color={LuxuryColors.textSecondary} 
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={style}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          maxWidth: '100%',
        }}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={{
          fontSize: 13,
          color: LuxuryColors.textSecondary,
          flex: 1,
        }} numberOfLines={1} ellipsizeMode="tail">
          {selectedProperty.name} • {selectedProperty.location}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={14} 
          color={LuxuryColors.textSecondary} 
          style={{ marginLeft: 4, flexShrink: 0 }}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <LinearGradient 
            colors={LuxuryColors.luxuryBackgroundGradient as any}
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
            }}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: LuxuryColors.border + '30',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: LuxuryColors.text,
              }}>
                Select Property
              </Text>
              
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  padding: 4,
                }}
              >
                <Ionicons name="close" size={24} color={LuxuryColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{
                padding: 40,
                alignItems: 'center',
              }}>
                <ActivityIndicator size="large" color={LuxuryColors.accent} />
                <Text style={{
                  marginTop: 16,
                  fontSize: 14,
                  color: LuxuryColors.textSecondary,
                }}>
                  Loading your properties...
                </Text>
              </View>
            ) : listings.length === 0 ? (
              <View style={{
                padding: 40,
                alignItems: 'center',
              }}>
                <Ionicons name="home-outline" size={48} color={LuxuryColors.textLight} />
                <Text style={{
                  marginTop: 16,
                  fontSize: 16,
                  fontWeight: '600',
                  color: LuxuryColors.text,
                  textAlign: 'center',
                }}>
                  No Properties Found
                </Text>
                <Text style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: LuxuryColors.textSecondary,
                  textAlign: 'center',
                }}>
                  Please check your API configuration
                </Text>
              </View>
            ) : (
              <FlatList
                data={listings}
                renderItem={renderPropertyItem}
                keyExtractor={(item) => item.id}
                style={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
} 