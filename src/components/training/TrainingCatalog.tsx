'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Clock, 
  Star, 
  BookOpen, 
  PlayCircle,
  CheckCircle,
  Award,
  Users,
  Lightbulb,
  Target
} from 'lucide-react';

interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  course_type: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  tags: string[];
  is_required: boolean;
  credits: number;
  thumbnail_url?: string;
  category: {
    name: string;
    color: string;
    icon: string;
  };
  enrollment?: {
    id: string;
    status: string;
    progress_percentage: number;
    final_score?: number;
  };
}

interface TrainingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  children?: TrainingCategory[];
}

interface TrainingCatalogProps {
  userId: string;
}

export default function TrainingCatalog({ userId }: TrainingCatalogProps) {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [recommendations, setRecommendations] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, [userId]);

  useEffect(() => {
    fetchCourses();
  }, [searchTerm, selectedCategory, selectedDifficulty, selectedStatus]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesResponse = await fetch('/api/training/categories');
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        setCategories(categoriesResult.data);
      }

      // Fetch recommendations
      const recommendationsResponse = await fetch(`/api/training/recommendations?user_id=${userId}&limit=5`);
      if (recommendationsResponse.ok) {
        const recommendationsResult = await recommendationsResponse.json();
        setRecommendations(recommendationsResult.data);
      }

      // Initial courses fetch
      await fetchCourses();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedDifficulty) params.append('difficulty_level', selectedDifficulty);
      params.append('is_active', 'true');

      const response = await fetch(`/api/training/courses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch courses');

      const result = await response.json();
      
      // If we need to filter by enrollment status, get user enrollments
      let coursesWithEnrollment = result.data;
      if (selectedStatus !== 'all') {
        const enrollmentsResponse = await fetch(`/api/training/enrollments?user_id=${userId}`);
        if (enrollmentsResponse.ok) {
          const enrollmentsResult = await enrollmentsResponse.json();
          const enrollmentsByCourse = enrollmentsResult.data.reduce((acc: any, enrollment: any) => {
            acc[enrollment.course.id] = enrollment;
            return acc;
          }, {});

          coursesWithEnrollment = result.data.map((course: TrainingCourse) => ({
            ...course,
            enrollment: enrollmentsByCourse[course.id]
          }));

          // Filter by status
          if (selectedStatus === 'enrolled') {
            coursesWithEnrollment = coursesWithEnrollment.filter((course: TrainingCourse) => course.enrollment);
          } else if (selectedStatus === 'not_enrolled') {
            coursesWithEnrollment = coursesWithEnrollment.filter((course: TrainingCourse) => !course.enrollment);
          } else if (selectedStatus === 'completed') {
            coursesWithEnrollment = coursesWithEnrollment.filter((course: TrainingCourse) => 
              course.enrollment?.status === 'completed'
            );
          }
        }
      }

      setCourses(coursesWithEnrollment);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleEnrollInCourse = async (courseId: string) => {
    try {
      const response = await fetch('/api/training/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId })
      });

      if (response.ok) {
        await fetchCourses(); // Refresh courses to show enrollment
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const getCourseIcon = (courseType: string) => {
    switch (courseType) {
      case 'video': return <PlayCircle className="w-5 h-5" />;
      case 'interactive': return <Target className="w-5 h-5" />;
      case 'assessment': return <Award className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const getDifficultyBadge = (level: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {level}
      </Badge>
    );
  };

  const getEnrollmentStatus = (course: TrainingCourse) => {
    if (!course.enrollment) {
      return (
        <Button onClick={() => handleEnrollInCourse(course.id)}>
          Enroll Now
        </Button>
      );
    }

    switch (course.enrollment.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">Completed</span>
            {course.enrollment.final_score && (
              <span className="text-sm text-gray-600">
                ({Math.round(course.enrollment.final_score)}%)
              </span>
            )}
          </div>
        );
      case 'in_progress':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600">In Progress</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${course.enrollment.progress_percentage}%` }}
              ></div>
            </div>
          </div>
        );
      case 'enrolled':
        return (
          <Button variant="outline">
            Continue Learning
          </Button>
        );
      default:
        return (
          <Button variant="outline">
            View Course
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading training catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Training Catalog</h1>
          <p className="text-gray-600">Enhance your board governance skills with our comprehensive training programs</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="not_enrolled">Available</SelectItem>
                  <SelectItem value="enrolled">My Courses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="required">Required</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {courses.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Courses Found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more courses.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCourseIcon(course.course_type)}
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: course.category.color + '20', color: course.category.color }}
                        >
                          {course.category.name}
                        </Badge>
                      </div>
                      {course.is_required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {course.estimated_duration_hours}h
                        </div>
                        {getDifficultyBadge(course.difficulty_level)}
                      </div>
                      
                      {course.credits > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Award className="w-4 h-4" />
                          {course.credits} credits
                        </div>
                      )}

                      {course.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {course.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {course.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{course.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      {getEnrollmentStatus(course)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommended" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Recommended for You
              </CardTitle>
              <CardDescription>
                Courses selected based on your profile, goals, and learning history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recommendations available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((course) => (
                    <Card key={course.id} className="border-blue-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-blue-600">Recommended</span>
                        </div>
                        <CardTitle className="text-base">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" />
                            {course.estimated_duration_hours}h
                          </span>
                          {getDifficultyBadge(course.difficulty_level)}
                        </div>
                        <Button size="sm" className="w-full">
                          Start Learning
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="required" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Required Training
              </CardTitle>
              <CardDescription>
                Mandatory courses that must be completed for your role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courses.filter(course => course.is_required).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No required training at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.filter(course => course.is_required).map((course) => (
                    <div key={course.id} className="flex items-center gap-4 p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{course.title}</h3>
                          <Badge variant="destructive">Required</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {course.estimated_duration_hours}h
                          </span>
                          <span>{course.category.name}</span>
                        </div>
                      </div>
                      <div>
                        {getEnrollmentStatus(course)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}