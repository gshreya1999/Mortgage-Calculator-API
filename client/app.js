function formatNumberWithCommas(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function removeNonNumeric(value) {
  return value.replace(/[^0-9]/g, '');
}

const addCommas = function (e) {
  let input = e.target.value;
  input = removeNonNumeric(input);
  e.target.value = formatNumberWithCommas(input);
}

document.getElementById('property-price').addEventListener('input', addCommas);
document.getElementById('down-payment').addEventListener('input', addCommas);

document.getElementById("mortgage-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  
  const propertyPrice = parseFloat(removeNonNumeric(document.getElementById("property-price").value));
  const annualInterestRate = parseFloat(document.getElementById("interest-rate").value);
  const amortizationPeriod = parseInt(document.getElementById("amortization-period").value);
  const downPayment = parseFloat(removeNonNumeric(document.getElementById("down-payment").value));
  const paymentSchedule = document.getElementById("payment-schedule").value;
  
  try {
    const response = await fetch('http://localhost:3000/api/calculate-mortgage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyPrice,
        annualInterestRate, 
        amortizationPeriod,
        downPayment,
        paymentSchedule
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById("result").innerHTML = 
        `Payment per payment schedule: $${data.paymentPerPaymentSchedule}
        <br><br>
        CMHC insurance over the amortization period: $${data.cmhcInsurance}`;
    } else {
      document.getElementById("result").textContent = `Error: ${data.error}`;
    }    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById("result").textContent = 'An error occurred. Please try again.';
  }
});
