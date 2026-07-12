"""Storage: PostgreSQL interaction for expense persistence."""

import psycopg2
from psycopg2 import IntegrityError, OperationalError, DatabaseError
from psycopg2.extras import RealDictCursor
from typing import Callable, Optional, List

from .config import DATABASE_URL
from .models import Expense


class StorageError(Exception):
    """Base exception for storage operations."""
    pass


def _default_conn_factory():
    try:
        return psycopg2.connect(DATABASE_URL)
    except psycopg2.OperationalError as e:
        raise StorageError(f"Failed to connect to database: {e}")


class ExpenseStore:
    """Stores and retrieves expenses from PostgreSQL.

    Accepts an injectable conn_factory for testability. The factory is called
    once per operation; the connection is closed when the operation completes.
    """

    def __init__(self, conn_factory: Callable = None):
        self._conn_factory = conn_factory or _default_conn_factory

    def store_expense(self, expense: Expense, validation_errors: Optional[str] = None) -> int:
        """
        Store an expense in PostgreSQL.

        Returns:
            ID of the stored expense.

        Raises:
            StorageError: If insert fails.
        """
        conn = self._conn_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO expenses (amount, currency, category, description, datetime, confidence, validation_errors)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (
                        expense.amount,
                        expense.currency,
                        expense.category,
                        expense.description,
                        expense.datetime,
                        expense.confidence,
                        validation_errors,
                    ),
                )
                expense_id = cur.fetchone()[0]
                conn.commit()
                return expense_id
        except IntegrityError as e:
            conn.rollback()
            raise StorageError(f"Invalid expense data (constraint violation): {e}") from e
        except OperationalError as e:
            conn.rollback()
            raise StorageError(f"Database connection error: {e}") from e
        except DatabaseError as e:
            conn.rollback()
            raise StorageError(f"Database error: {e}") from e
        finally:
            conn.close()

    def store_expenses(self, expenses: List[Expense], validation_errors: Optional[str] = None) -> List[int]:
        """Store a list of expenses, inserting one row per expense."""
        return [self.store_expense(expense, validation_errors=validation_errors) for expense in expenses]

    def get_all_expenses(self) -> List[dict]:
        """
        Retrieve all expenses, ordered by datetime (newest first).

        Raises:
            StorageError: If query fails.
        """
        conn = self._conn_factory()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, amount, currency, category, description, datetime, confidence, validation_errors, created_at
                    FROM expenses
                    ORDER BY datetime DESC;
                    """
                )
                return cur.fetchall()
        except OperationalError as e:
            raise StorageError(f"Database connection error: {e}") from e
        except DatabaseError as e:
            raise StorageError(f"Database error while retrieving expenses: {e}") from e
        finally:
            conn.close()

    def get_expenses_by_category(self, category: str) -> List[dict]:
        """
        Retrieve expenses filtered by category.

        Raises:
            StorageError: If query fails.
        """
        conn = self._conn_factory()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, amount, currency, category, description, datetime, confidence, validation_errors, created_at
                    FROM expenses
                    WHERE category = %s
                    ORDER BY datetime DESC;
                    """,
                    (category,),
                )
                return cur.fetchall()
        except OperationalError as e:
            raise StorageError(f"Database connection error: {e}") from e
        except DatabaseError as e:
            raise StorageError(f"Database error while retrieving expenses by category: {e}") from e
        finally:
            conn.close()

    def get_total_expense(self) -> float:
        """
        Get total expense sum.

        Raises:
            StorageError: If query fails.
        """
        conn = self._conn_factory()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT SUM(amount) FROM expenses WHERE validation_errors IS NULL;")
                result = cur.fetchone()[0]
                return result or 0.0
        except OperationalError as e:
            raise StorageError(f"Database connection error: {e}") from e
        except DatabaseError as e:
            raise StorageError(f"Database error while calculating total: {e}") from e
        finally:
            conn.close()

    def log_validation_failure(self, user_input: str, error_message: str, attempt_number: int):
        """
        Log a validation failure for analysis.

        Raises:
            StorageError: If insert fails.
        """
        conn = self._conn_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO validation_logs (user_input, error_message, attempt_number)
                    VALUES (%s, %s, %s);
                    """,
                    (user_input, error_message, attempt_number),
                )
                conn.commit()
        except IntegrityError as e:
            conn.rollback()
            raise StorageError(f"Invalid validation log data: {e}") from e
        except OperationalError as e:
            conn.rollback()
            raise StorageError(f"Database connection error: {e}") from e
        except DatabaseError as e:
            conn.rollback()
            raise StorageError(f"Database error while logging validation failure: {e}") from e
        finally:
            conn.close()
