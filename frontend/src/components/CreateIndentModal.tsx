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

interface CreateIndentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  banks: any[];
}

const validationSchema = Yup.object({
  merchantName: Yup.string().required('Required'),
  mobile: Yup.string().required('Required').matches(/^[0-9]{10}$/, 'Must be 10 digits'),
  bankId: Yup.string().required('Required'),
  deliveryType: Yup.string().required('Required'),
  remarks: Yup.string().optional(),
});

const CreateIndentModal: React.FC<CreateIndentModalProps> = ({ open, onClose, onSubmit, banks }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Indent</DialogTitle>
      <Formik
        initialValues={{ 
          merchantName: '', 
          mobile: '', 
          bankId: '', 
          deliveryType: 'OPEX', 
          remarks: '' 
        }}
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
                  name="merchantName"
                  label="Merchant Name"
                  value={values.merchantName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.merchantName && !!errors.merchantName}
                  helperText={touched.merchantName && errors.merchantName}
                  fullWidth
                />

                <TextField
                  name="mobile"
                  label="Mobile Number"
                  value={values.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.mobile && !!errors.mobile}
                  helperText={touched.mobile && errors.mobile}
                  fullWidth
                />

                <TextField
                  select
                  name="bankId"
                  label="Select Bank"
                  value={values.bankId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.bankId && !!errors.bankId}
                  helperText={touched.bankId && errors.bankId}
                  fullWidth
                >
                  {banks.map(bank => (
                    <MenuItem key={bank.id} value={bank.id}>{bank.bankName}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  name="deliveryType"
                  label="Delivery Type"
                  value={values.deliveryType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                >
                  <MenuItem value="OPEX">OPEX</MenuItem>
                  <MenuItem value="CAPEX">CAPEX</MenuItem>
                </TextField>

                <TextField
                  name="remarks"
                  label="Remarks"
                  multiline
                  rows={2}
                  value={values.remarks}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Create Indent</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CreateIndentModal;
