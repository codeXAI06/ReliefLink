"""
Server-Sent Events (SSE) event bus for real-time updates
"""
import asyncio
import json
from typing import AsyncGenerator
from datetime import datetime, timezone
from .logging_config import get_logger

logger = get_logger("events")


class EventBus:
    """Simple pub/sub event bus for SSE streaming"""

    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []

    async def subscribe(self) -> AsyncGenerator[str, None]:
        """Subscribe to events. Yields SSE-formatted strings."""
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(queue)
        logger.info(f"New SSE subscriber (total: {len(self._subscribers)})")
        try:
            while True:
                data = await queue.get()
                yield data
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.remove(queue)
            logger.info(f"SSE subscriber disconnected (total: {len(self._subscribers)})")

    async def publish(self, event_type: str, data: dict):
        """Publish an event to all subscribers"""
        message = f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"
        disconnected = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                disconnected.append(queue)
        # Clean up full queues
        for q in disconnected:
            if q in self._subscribers:
                self._subscribers.remove(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


# Global event bus instance
event_bus = EventBus()
