"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, User, Mail, Car, Star, Edit, Save, Camera } from "lucide-react"

interface ProfilePageProps {
  onBack: () => void
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: "John Driver",
    email: "john.driver@email.com",
    phone: "+1 (555) 123-4567",
    carModel: "Toyota Camry 2020",
    licensePlate: "ABC-1234",
    rating: 4.8,
    totalTrips: 156,
    memberSince: "January 2023",
  })

  const handleSave = () => {
    setIsEditing(false)
    // Save profile changes
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Profile & Settings</h1>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
          {isEditing ? "Save" : "Edit"}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Picture & Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
                {isEditing && (
                  <Button size="sm" className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0">
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="text-xl font-bold mb-2"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {profile.rating}
                  </span>
                  <span>{profile.totalTrips} trips</span>
                  <span>Since {profile.memberSince}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Email</label>
              {isEditing ? (
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              ) : (
                <p className="text-gray-900">{profile.email}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Phone</label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-green-500" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Car Model</label>
              {isEditing ? (
                <Input
                  value={profile.carModel}
                  onChange={(e) => setProfile({ ...profile, carModel: e.target.value })}
                />
              ) : (
                <p className="text-gray-900">{profile.carModel}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">License Plate</label>
              {isEditing ? (
                <Input
                  value={profile.licensePlate}
                  onChange={(e) => setProfile({ ...profile, licensePlate: e.target.value })}
                />
              ) : (
                <p className="text-gray-900">{profile.licensePlate}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Notifications</span>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Privacy Settings</span>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Payment Methods</span>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Help & Support</span>
              <Button variant="outline" size="sm">
                Contact
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Button variant="outline" className="w-full bg-transparent">
              Change Password
            </Button>
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
