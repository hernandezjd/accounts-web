export interface Workspace {
  id: string
  name: string
  status: 'active' | 'inactive'
  organizationId?: string
}
