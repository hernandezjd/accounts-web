import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useTranslation } from 'react-i18next'

export function HelpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<string | false>('gettingStarted')

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  function handleBack() {
    navigate(-1)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        pt: 4,
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 720, p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
            aria-label={t('common.back')}
          >
            {t('common.back')}
          </Button>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            {t('help.title')}
          </Typography>
        </Box>

        <Accordion
          expanded={expanded === 'gettingStarted'}
          onChange={handleChange('gettingStarted')}
          data-testid="help-section-gettingStarted"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.gettingStarted.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.gettingStarted.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === 'workspaces'}
          onChange={handleChange('workspaces')}
          data-testid="help-section-workspaces"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.workspaces.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.workspaces.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === 'accounts'}
          onChange={handleChange('accounts')}
          data-testid="help-section-accounts"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.accounts.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.accounts.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === 'accountChart'}
          onChange={handleChange('accountChart')}
          data-testid="help-section-accountChart"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.accountChart.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.accountChart.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === 'initialBalances'}
          onChange={handleChange('initialBalances')}
          data-testid="help-section-initialBalances"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.initialBalances.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.initialBalances.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === 'transactions'}
          onChange={handleChange('transactions')}
          data-testid="help-section-transactions"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('help.transactions.title')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {t('help.transactions.description')}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  )
}
