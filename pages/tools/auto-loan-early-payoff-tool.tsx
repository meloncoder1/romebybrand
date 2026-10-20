
// /pages/tools/auto-loan-early-payoff-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface LoanInput {
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  monthsRemaining: number;
  lumpSum: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface PayoffResults {
  currentPayoffMonths: number;
  currentInterest: number;
  lumpSumPayoffMonths: number;
  lumpSumInterest: number;
  interestSaved: number;
  paymentToKeepTerm: number;
}

const formatJmd = (amount: number) =>
  new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency: 'JMD',
    minimumFractionDigits: 2,
  }).format(amount);

const simulatePayoff = (balance: number, payment: number, monthlyRate: number) => {
  let remainingBalance = balance;
  let totalInterest = 0;
  let months = 0;

  while (remainingBalance > 0.005 && months < 1200) {
    const interest = remainingBalance * monthlyRate;
    if (payment <= interest) return null;
    totalInterest += interest;
    remainingBalance = Math.max(0, remainingBalance + interest - payment);
    months += 1;
  }

  return remainingBalance <= 0.005 ? { months, totalInterest } : null;
};

const AutoLoanEarlyPayoffTool: React.FC = () => {
  const [loanInput, setLoanInput] = useState<LoanInput>({
    currentBalance: 0,
    interestRate: 0,
    monthlyPayment: 0,
    monthsRemaining: 0,
    lumpSum: 0,
  });

  const [results, setResults] = useState<PayoffResults | null>(null);
  const [calculationError, setCalculationError] = useState('');

  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanInput((prev) => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
  };

  const calculateEarlyPayoff = () => {
    const { currentBalance, interestRate, monthlyPayment, monthsRemaining, lumpSum } = loanInput;
    if (
      !Number.isFinite(currentBalance) || currentBalance <= 0 ||
      !Number.isFinite(interestRate) || interestRate < 0 ||
      !Number.isFinite(monthlyPayment) || monthlyPayment <= 0 ||
      !Number.isFinite(monthsRemaining) || monthsRemaining <= 0 ||
      !Number.isFinite(lumpSum) || lumpSum < 0 || lumpSum > currentBalance
    ) {
      setCalculationError('Enter valid loan values, with a lump sum no greater than the current balance.');
      setResults(null);
      return;
    }

    const monthlyRate = interestRate / 100 / 12;
    const currentSchedule = simulatePayoff(currentBalance, monthlyPayment, monthlyRate);
    const postLumpSumBalance = currentBalance - lumpSum;
    const lumpSumSchedule = simulatePayoff(postLumpSumBalance, monthlyPayment, monthlyRate);
    if (!currentSchedule || !lumpSumSchedule) {
      setCalculationError('The installment must be greater than the monthly interest to pay down this loan.');
      setResults(null);
      return;
    }

    const paymentToKeepTerm = monthlyRate === 0
      ? postLumpSumBalance / monthsRemaining
      : postLumpSumBalance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -monthsRemaining));

    setCalculationError('');
    setResults({
      currentPayoffMonths: currentSchedule.months,
      currentInterest: currentSchedule.totalInterest,
      lumpSumPayoffMonths: lumpSumSchedule.months,
      lumpSumInterest: lumpSumSchedule.totalInterest,
      interestSaved: currentSchedule.totalInterest - lumpSumSchedule.totalInterest,
      paymentToKeepTerm,
    });
    setChartData([
      { name: 'Without lump sum', value: currentSchedule.months },
      { name: 'With lump sum', value: lumpSumSchedule.months },
    ]);
  };

  const exportCSV = () => {
    if (!results) return;
    const csvContent = `data:text/csv;charset=utf-8,Current Balance,Interest Rate,Monthly Payment,Lump Sum,Current Payoff Months,Payoff Months After Lump Sum,Interest Saved\n${loanInput.currentBalance},${loanInput.interestRate},${loanInput.monthlyPayment},${loanInput.lumpSum},${results.currentPayoffMonths},${results.lumpSumPayoffMonths},${results.interestSaved}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'auto_loan_early_payoff.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Loan Lump-Sum Payoff Planner</title>
        <meta name="description" content="Compare loan payoff schedules before and after a lump-sum payment." />
        <meta name="keywords" content="auto loan, early payoff, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/auto-loan-early-payoff-tool" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Loan Lump-Sum Payoff Planner</h1>
      <p className="text-base text-gray-700 mb-4">
        Estimate how a lump sum affects your loan when applied directly to principal.
      </p>
      <div className="mb-8">
        <label className="block mb-2 text-xl font-semibold">Current balance (JMD)</label>
        <input
          type="number"
          name="currentBalance"
          value={loanInput.currentBalance}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Annual interest rate (%)</label>
        <input
          type="number"
          name="interestRate"
          value={loanInput.interestRate}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Regular monthly installment (JMD)</label>
        <input
          type="number"
          name="monthlyPayment"
          value={loanInput.monthlyPayment}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Months remaining</label>
        <input
          type="number"
          name="monthsRemaining"
          value={loanInput.monthsRemaining}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">One-time lump sum (JMD)</label>
        <input
          type="number"
          name="lumpSum"
          value={loanInput.lumpSum}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={calculateEarlyPayoff}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Calculate
        </button>
      </div>
      {calculationError && <p role="alert" className="mb-4 text-red-700">{calculationError}</p>}
      {results && <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-2">Interest without lump sum: {formatJmd(results.currentInterest)}</p>
        <p className="text-base text-gray-700 mb-2">Estimated interest after lump sum: {formatJmd(results.lumpSumInterest)}</p>
        <p className="text-base text-green-700 font-semibold mb-2">Estimated interest saved: {formatJmd(results.interestSaved)}</p>
        <p className="text-base text-gray-700 mb-2">Estimated payoff after lump sum: {results.lumpSumPayoffMonths} months</p>
        <p className="text-base text-gray-700 mb-4">Estimated payment to finish in {loanInput.monthsRemaining} months: {formatJmd(results.paymentToKeepTerm)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={exportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
        >
          <Download className="mr-2" /> Export CSV
        </button>
      </div>}
      <p className="mb-8 text-sm text-gray-600">
        Estimate assumes monthly compounding and the lump sum immediately reduces principal. Ask the lender for an official settlement quote, fees, and confirmation that the installment will stay the same or the term will be shortened.
      </p>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How does paying extra affect my loan?</li>
      <li>Can I pay off my loan early without penalties?</li>
      <li>What is the best strategy for early payoff?</li>
    </ul>
  </div>
);

export default AutoLoanEarlyPayoffTool;
