/**
 * coreply
 *
 * Copyright (C) 2024 coreply
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package app.coreply.coreplyapp.applistener

import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

// ** Created helper function to serialize AccessibilityNodeInfo to JSON, including children
fun AccessibilityNodeInfo.serializeToJson(): JSONObject {
    val json = JSONObject()

    // Basic properties
    json.putOpt("id", viewIdResourceName)
    json.putOpt("viewIdResourceName", viewIdResourceName)
    json.putOpt("className", className)
    json.putOpt("text", text)
    json.putOpt("contentDescription", contentDescription)
    json.putOpt("hintText", hintText)
    json.putOpt("packageName", packageName)
    json.putOpt("isEditable", isEditable)
    json.putOpt("isFocused", isFocused)
    json.putOpt("isVisibleToUser", isVisibleToUser)
    json.putOpt("isShowingHintText", isShowingHintText)

    // Bounds
    val bounds = JSONObject()
    val rect = android.graphics.Rect()
    this.getBoundsInScreen(rect)
    bounds.put("left", rect.left)
    bounds.put("top", rect.top)
    bounds.put("right", rect.right)
    bounds.put("bottom", rect.bottom)

    json.putOpt("bounds", bounds)

    // Children
    val childrenArray = JSONArray()
    val childCount = childCount
    for (i in 0 until childCount) {
        val child = getChild(i)
        child?.let {
            childrenArray.put(it.serializeToJson())
        }
    }
    json.putOpt("children", childrenArray)

    return json
}

// Helper extension function to put optional values
private fun JSONObject.putOpt(key: String, value: Any?) {
    if (value != null) {
        put(key, value)
    }
}