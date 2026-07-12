"""Unit tests for ExpenseStore using a fake connection (no live DB required)."""

from unittest.mock import MagicMock, call
import pytest

from src.models import Expense
from src.storage import ExpenseStore, StorageError


def _make_expense(**kwargs):
    defaults = dict(
        amount=50.0,
        currency="UAH",
        category="Кафе/Ресторани",
        description="купив каву",
        datetime="2026-06-27T14:30:00",
        confidence=0.95,
    )
    defaults.update(kwargs)
    return Expense(**defaults)


class FakeCursor:
    def __init__(self, fetchone_val=None, fetchall_val=None):
        self._fetchone_val = fetchone_val
        self._fetchall_val = fetchall_val or []
        self.execute = MagicMock()

    def fetchone(self):
        return self._fetchone_val

    def fetchall(self):
        return self._fetchall_val

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class FakeConnection:
    def __init__(self, cursor: FakeCursor):
        self._cursor = cursor
        self.commit = MagicMock()
        self.rollback = MagicMock()
        self.close = MagicMock()

    def cursor(self, cursor_factory=None):
        return self._cursor


def _store_with(cursor: FakeCursor) -> ExpenseStore:
    conn = FakeConnection(cursor)
    return ExpenseStore(conn_factory=lambda: conn), conn


class TestStoreExpense:
    def test_inserts_correct_values(self):
        cursor = FakeCursor(fetchone_val=(42,))
        store, conn = _store_with(cursor)
        expense = _make_expense()

        result_id = store.store_expense(expense)

        assert result_id == 42
        cursor.execute.assert_called_once()
        sql, params = cursor.execute.call_args[0]
        assert "INSERT INTO expenses" in sql
        assert params[0] == 50.0   # amount
        assert params[2] == "Кафе/Ресторани"  # category
        conn.commit.assert_called_once()
        conn.close.assert_called_once()

    def test_stores_validation_errors(self):
        cursor = FakeCursor(fetchone_val=(1,))
        store, _ = _store_with(cursor)
        expense = _make_expense()

        store.store_expense(expense, validation_errors="confidence < 0.7")

        _, params = cursor.execute.call_args[0]
        assert params[6] == "confidence < 0.7"

    def test_store_expenses_calls_store_expense_per_item(self):
        cursor = FakeCursor(fetchone_val=(1,))
        conn = FakeConnection(cursor)
        call_count = 0

        def factory():
            nonlocal call_count
            call_count += 1
            return conn

        store = ExpenseStore(conn_factory=factory)
        expenses = [_make_expense(), _make_expense(amount=30.0, description="хліб")]

        ids = store.store_expenses(expenses)

        assert len(ids) == 2
        assert call_count == 2  # one connection per expense


class TestGetAllExpenses:
    def test_returns_fetchall_result(self):
        rows = [{"id": 1, "amount": 50.0}, {"id": 2, "amount": 30.0}]
        cursor = FakeCursor(fetchall_val=rows)
        store, conn = _store_with(cursor)

        result = store.get_all_expenses()

        assert result == rows
        cursor.execute.assert_called_once()
        assert "FROM expenses" in cursor.execute.call_args[0][0]
        conn.close.assert_called_once()


class TestGetTotalExpense:
    def test_returns_sum(self):
        cursor = FakeCursor(fetchone_val=(150.0,))
        store, _ = _store_with(cursor)

        total = store.get_total_expense()

        assert total == 150.0

    def test_returns_zero_when_no_expenses(self):
        cursor = FakeCursor(fetchone_val=(None,))
        store, _ = _store_with(cursor)

        total = store.get_total_expense()

        assert total == 0.0


class TestGetExpensesByCategory:
    def test_passes_category_as_param(self):
        rows = [{"id": 1, "category": "Транспорт"}]
        cursor = FakeCursor(fetchall_val=rows)
        store, _ = _store_with(cursor)

        result = store.get_expenses_by_category("Транспорт")

        assert result == rows
        _, params = cursor.execute.call_args[0]
        assert params == ("Транспорт",)


class TestLogValidationFailure:
    def test_inserts_into_validation_logs(self):
        cursor = FakeCursor()
        store, conn = _store_with(cursor)

        store.log_validation_failure("купив каву", "amount is null", 1)

        cursor.execute.assert_called_once()
        sql, params = cursor.execute.call_args[0]
        assert "INSERT INTO validation_logs" in sql
        assert params == ("купив каву", "amount is null", 1)
        conn.commit.assert_called_once()
        conn.close.assert_called_once()
