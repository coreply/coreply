package app.coreply.coreplymodule

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object CoreplyDisableRequests {
  private val requests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

  val flow: SharedFlow<Unit> = requests.asSharedFlow()

  fun emit() {
    requests.tryEmit(Unit)
  }
}
