import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/_admin/login/LoginPage'
import { RequireAuth } from './pages/_admin/RequireAuth'
import AdminLayout from './pages/_admin/admin-layout/AdminLayout'
import MyWhaleTab from './pages/_admin/my-whale-tab/MyWhaleTab'
import PostsTab from './pages/_admin/posts-tab/PostsTab'
import ScoutsTab from './pages/_admin/scouts-tab/ScoutsTab'
import TimelinePage from './pages/timeline-2/TimelinePage'
import ScoutsPage from './pages/scouts/ScoutsPage'
import { Leaderboard } from './pages/leaderboard/Leaderboard'
import { JoinPage } from './pages/join/JoinPage'
import { AboutPage } from './pages/about/AboutPage'
import { QRPage } from './pages/qr/QRPage'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<TimelinePage />} />
          <Route path='/timeline/*'   element={<TimelinePage />}  />
          <Route path='/scouts/*'     element={<ScoutsPage />}    />
          <Route path='/leaderboard'  element={<Leaderboard />}   />
          <Route path='/join'         element={<JoinPage />}      />
          <Route path='/qr'           element={<QRPage />}        />
          <Route path='/about'        element={<AboutPage />}     />

          <Route path='/login'        element={<LoginPage />}     />

          {/* Admin Pages */}
          <Route
            path='/admin/*'
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to='/admin/posts' replace />} />

            <Route path='posts'    element={<PostsTab />}   />
            <Route path='my-whale' element={<MyWhaleTab />} />
            <Route path='scouts'     element={<ScoutsTab />}    />

            <Route path="*" element={<Navigate to="/admin/posts" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
