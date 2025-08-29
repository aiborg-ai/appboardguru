'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Car, 
  Phone, 
  Mail, 
  ExternalLink, 
  Navigation, 
  Users, 
  Accessibility,
  Video,
  Globe,
  Copy
} from 'lucide-react';
import { MeetingDetailsFull, VenueDetails } from '@/types/meeting-details';

interface VenueLogisticsProps {
  meeting: MeetingDetailsFull;
  venue?: VenueDetails;
  onRefresh: () => void;
}

export const VenueLogistics = React.memo(function VenueLogistics({
  meeting,
  venue,
  onRefresh
}: VenueLogisticsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Meeting Location Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Meeting Location & Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Physical Location */}
            {venue && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  Physical Venue
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{venue.name}</h4>
                    <p className="text-sm text-gray-600">{venue.address}</p>
                    <p className="text-sm text-gray-600">{venue.city}, {venue.country}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>Capacity: {venue.capacity}</span>
                    </div>
                    {venue.parkingAvailable && (
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4 text-gray-500" />
                        <span>Parking Available</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {venue.facilities.map((facility, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {facility}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline">
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                    {venue.mapUrl && (
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Map
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Virtual Meeting */}
            {meeting.virtualMeetingUrl && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Video className="h-5 w-5 text-gray-600" />
                  Virtual Meeting
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-blue-800">
                    {meeting.isHybrid 
                      ? 'Join virtually if you cannot attend in person'
                      : 'This meeting is held entirely online'
                    }
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Meeting Link</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white p-2 rounded border">
                        {meeting.virtualMeetingUrl}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(meeting.virtualMeetingUrl || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.open(meeting.virtualMeetingUrl, '_blank')}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                    <Button size="sm" variant="outline">
                      Test Connection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {venue && (venue.contactPhone || venue.contactEmail) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venue.contactPhone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{venue.contactPhone}</p>
                  </div>
                </div>
              )}
              
              {venue.contactEmail && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600">{venue.contactEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessibility Features */}
      {venue && venue.accessibilityFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              Accessibility Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {venue.accessibilityFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 p-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Directions */}
      {venue && venue.directions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Directions & Transportation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-700">
              <p>{venue.directions}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Transportation Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" size="sm" className="justify-start">
                  <Car className="h-4 w-4 mr-2" />
                  Driving Directions
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Navigation className="h-4 w-4 mr-2" />
                  Public Transit
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Nearby Parking
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Requirements */}
      {meeting.virtualMeetingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Technical Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Minimum Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Stable internet connection (5 Mbps+)</li>
                    <li>• Webcam and microphone</li>
                    <li>• Modern web browser or desktop app</li>
                    <li>• Quiet environment for audio clarity</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommended</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Headset for better audio quality</li>
                    <li>• High-definition webcam</li>
                    <li>• Secondary monitor for documents</li>
                    <li>• Backup internet connection</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  Test Audio/Video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});