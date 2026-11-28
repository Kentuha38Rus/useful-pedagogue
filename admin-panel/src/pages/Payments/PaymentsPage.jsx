import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';

const PaymentsPage = () => (
  <div>
    <h1>Платежи</h1>
    <Card style={{ padding: 20 }}>
      <p style={{ marginTop: 0 }}>
        Платежи родителей теперь ведутся в разделе «Финансы»: начисления за месяц,
        фактические оплаты, долги и общая аналитика по филиалам.
      </p>
      <Link to="/finance" style={{ color: '#2563eb', fontWeight: 600 }}>
        Перейти в «Финансы» →
      </Link>
    </Card>
  </div>
);

export default PaymentsPage;
