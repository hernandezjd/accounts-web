import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import { Outlet, useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { AppHeader } from './AppHeader'
import { SideNav } from './SideNav'
import { VersionFooter } from '../VersionFooter'
import { QuotaStatusBar } from '../QuotaStatusBar'

const DRAWER_WIDTH = 220

export function AppShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const setSelectedWorkspaceId = useAppStore((s) => s.setSelectedWorkspaceId)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Sync URL workspaceId into store
  useEffect(() => {
    if (workspaceId) {
      setSelectedWorkspaceId(workspaceId)
      sessionStorage.setItem('lastWorkspaceId', workspaceId)
    }
  }, [workspaceId, setSelectedWorkspaceId])

  function handleMenuToggle() {
    setMobileOpen((prev) => !prev)
  }

  const drawerContent = <SideNav />

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppHeader onMenuToggle={handleMenuToggle} />

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleMenuToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
        }}
        open
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Outlet />
        <QuotaStatusBar />
        <VersionFooter />
      </Box>
    </Box>
  )
}
