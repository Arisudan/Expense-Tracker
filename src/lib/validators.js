/**
 * Input Validation
 * 
 * Validates expense form data before submission.
 * Returns { valid: boolean, errors: { date?, details?, price? } }
 */

function validateExpense(data) {
  const errors = {};

  // Date validation
  if (!data.date) {
    errors.date = 'Date is required.';
  } else {
    // Check if date is valid
    const dateObj = new Date(data.date + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      errors.date = 'Invalid date.';
    }
  }

  // Details validation
  if (!data.details || data.details.trim().length === 0) {
    errors.details = 'Details cannot be empty.';
  } else if (data.details.trim().length > 500) {
    errors.details = 'Details are too long.';
  }

  // Price validation
  if (data.price === '' || data.price == null) {
    errors.price = 'Price is required.';
  } else {
    const price = Number(data.price);
    if (isNaN(price)) {
      errors.price = 'Enter a valid number.';
    } else if (price <= 0) {
      errors.price = 'Price must be greater than zero.';
    } else if (price > 99999999.99) {
      errors.price = 'Price is too large.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
