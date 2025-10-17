import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import ProjectsList from './routes/ProjectsList'
import ProjectDetail from './routes/ProjectDetail'
import PropertiesList from './routes/PropertiesList'
import PropertyDetail from './routes/PropertyDetail'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import Login from './routes/Login'
import AdminRoute from './routes/AdminRoute'
import AdminLayout from './routes/admin/AdminLayout'
import AdminProjects from './routes/admin/AdminProjects'
import AdminProperties from './routes/admin/AdminProperties'
import AdminAmenities from './routes/admin/AdminAmenities'
import AdminPosts from './routes/admin/AdminPosts'
import AdminCategories from './routes/admin/AdminCategories'
import AdminProfiles from './routes/admin/AdminProfiles'
import AdminContacts from './routes/admin/AdminContacts'
import AdminReviews from './routes/admin/AdminReviews'
import AdminFavorites from './routes/admin/AdminFavorites'
import AdminSavedSearches from './routes/admin/AdminSavedSearches'
import AdminOrders from './routes/admin/AdminOrders'
import AdminPackages from './routes/admin/AdminPackages'
import AdminPostDownloads from './routes/admin/AdminPostDownloads'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ProjectsList /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'properties', element: <PropertiesList /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
      { path: 'login', element: <Login /> },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        ),
        children: [
          { index: true, element: <AdminProjects /> },
          { path: 'projects', element: <AdminProjects /> },
          { path: 'properties', element: <AdminProperties /> },
          { path: 'categories', element: <AdminCategories /> },
          { path: 'amenities', element: <AdminAmenities /> },
          { path: 'posts', element: <AdminPosts /> },
          { path: 'profiles', element: <AdminProfiles /> },
          { path: 'contacts', element: <AdminContacts /> },
          { path: 'reviews', element: <AdminReviews /> },
          { path: 'favorites', element: <AdminFavorites /> },
          { path: 'saved-searches', element: <AdminSavedSearches /> },
          { path: 'orders', element: <AdminOrders /> },
          { path: 'packages', element: <AdminPackages /> },
          { path: 'post-downloads', element: <AdminPostDownloads /> }
        ]
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
