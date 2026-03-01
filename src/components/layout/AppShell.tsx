import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import { Outlet, useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { AppHeader } from './AppHeader'
import { SideNav } from './SideNav'

const DRAWER_WIDTH = 220

export function AppShell() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const setSelectedTenantId = useAppStore((s) => s.setSelectedTenantId)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Sync URL tenantId into store
  useEffect(() => {
    if (tenantId) {
      setSelectedTenantId(tenantId)
      sessionStorage.setItem('lastTenantId', tenantId)
    }
  }, [tenantId, setSelectedTenantId])

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
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
