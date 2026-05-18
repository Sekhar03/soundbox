import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  Box 
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

interface StatusUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  indent: any;
}

const validationSchema = Yup.object({
  type: Yup.string().required('Required'),
  status: Yup.string().required('Required'),
  remarks: Yup.string().optional(),
});

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ open, onClose, onSubmit, indent }) => {
  if (!indent) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Update Status - {indent.merchant?.name}</DialogTitle>
      <Formik
        initialValues={{ type: 'CALLING', status: '', remarks: '' }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          onSubmit(values);
          onClose();
        }}
      >
        {({ values, handleChange, handleBlur, errors, touched }) => (
          <Form>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  select
                  name="type"
                  label="Activity Type"
                  value={values.type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.type && !!errors.type}
                  helperText={touched.type && errors.type}
                >
                  <MenuItem value="CALLING">Calling</MenuItem>
                  <MenuItem value="MAPPING">Mapping</MenuItem>
                  <MenuItem value="DELIVERY">Delivery</MenuItem>
                  <MenuItem value="INSTALLATION">Installation</MenuItem>
                  <MenuItem value="ACTIVATION">Activation</MenuItem>
                </TextField>

                <TextField
                  name="status"
                  label="New Status"
                  value={values.status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.status && !!errors.status}
                  helperText={touched.status && errors.status}
                  placeholder="e.g. ACCEPTED, DELIVERED, COMPLETED"
                />

                <TextField
                  name="remarks"
                  label="Remarks"
                  multiline
                  rows={3}
                  value={values.remarks}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Update Status</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default StatusUpdateModal;
