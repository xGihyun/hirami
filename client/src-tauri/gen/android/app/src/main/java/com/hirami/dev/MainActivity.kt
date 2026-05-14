package com.hirami.dev

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.Theme_app)
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
