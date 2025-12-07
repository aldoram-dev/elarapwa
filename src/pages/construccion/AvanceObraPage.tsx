import React from 'react';
import { Box, Typography, Paper, Container, Alert } from '@mui/material';
import { Construction } from 'lucide-react';

const AvanceObraPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper 
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          minHeight: '60vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF4CC 100%)',
          border: '2px dashed #FFA726',
          borderRadius: 4
        }}
      >
        <Construction size={80} color="#F57C00" style={{ marginBottom: 24 }} />
        <Typography variant="h3" gutterBottom fontWeight={700} color="warning.dark">
          🚧 Página en Construcción 🚧
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 600, mt: 2, mb: 4 }}>
          Avance de Obra
        </Typography>
        <Alert severity="warning" sx={{ maxWidth: 600, fontSize: '1.1rem' }}>
          <Typography variant="body1" fontWeight={600}>
            Esta funcionalidad está en desarrollo
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Próximamente podrás registrar y visualizar el avance de la construcción, con reportes fotográficos y gráficas de progreso.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
};

export default AvanceObraPage;
