package com.drazard.dndmanager;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.support.design.widget.Snackbar;
import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.text.Html;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import static android.text.Html.FROM_HTML_MODE_LEGACY;

public class ClassCardsAdapter extends RecyclerView.Adapter<ClassCardsAdapter.ClassCardViewHolder> {
    private String[] classes;
    private boolean[] expandList;
    private int campaign_id;
    private boolean first_time;
    private Campaign current;
    private DBHandler db;

    public boolean[] getExpandList() {
        return this.expandList;
    }

    public void setExpandList(boolean[] expandListIn) {
        this.expandList = expandListIn;
    }

    public static class ClassCardViewHolder extends RecyclerView.ViewHolder {
        private CardView card;

        /**
         * Card details
         */
        private final Context context;
        private TextView name;
        private TextView description;
        private ImageView class_icon;
        private TextView details;
        private ImageView expand_icon;
        private Button select_btn;

        public ClassCardViewHolder(View view) {
            super(view);
            context = view.getContext();
            card = (CardView) view.findViewById(R.id.class_card);
            name = (TextView) view.findViewById(R.id.class_name);
            description = (TextView) view.findViewById(R.id.class_description);
            class_icon = (ImageView) view.findViewById(R.id.class_icon);
            details = (TextView) view.findViewById(R.id.class_details);
            expand_icon = (ImageView) view.findViewById(R.id.class_details_expand_icon);
            select_btn = (Button) view.findViewById(R.id.btn_select_class);
        }
    }

    // Pass list of campaigns to adapter
    public ClassCardsAdapter(View v, int campaignId, boolean firstTime) {
        this.classes = v.getResources().getStringArray(R.array.character_class_options);
        if (this.expandList == null) {
            this.expandList = new boolean[this.classes.length];
        }
        this.campaign_id = campaignId;
        this.first_time = firstTime;
        this.db = DBHandler.getInstance(v.getContext());
        this.current = db.getCampaign(this.campaign_id);
    }

    // Create new views (invoked by the layout manager)
    @Override
    public ClassCardViewHolder onCreateViewHolder(ViewGroup viewGroup, int i) {
        View v = LayoutInflater.from(viewGroup.getContext())
                .inflate(R.layout.item_class_card, viewGroup, false);
        ClassCardViewHolder vh = new ClassCardViewHolder(v);
        return vh;
    }

    public String getCharacterClassDescription(Context c, int pos) {
        int stringId;
        // Attempt to fetch description for given character class
        try {
            String fieldName = "class_" + this.classes[pos].toLowerCase();
            stringId = R.string.class.getField(fieldName).getInt(null);
        } catch (Exception e) {
            stringId = R.string.no_character_class_description;
        }
        return c.getResources().getString(stringId);
    }

    public String getCharacterClassDetails(Context c, int pos) {
        int stringId;
        // Attempt to fetch additional details for given character class
        try {
            String fieldName = "class_" + this.classes[pos].toLowerCase() + "_details";
            stringId = R.string.class.getField(fieldName).getInt(null);
        } catch (Exception e) {
            stringId = R.string.no_character_class_details;
        }
        return c.getResources().getString(stringId);
    }

    public void updateVisibilityState(ClassCardViewHolder vh, int position) {
        if (expandList[position]) {
            vh.details.setVisibility(View.VISIBLE);
            vh.select_btn.setVisibility(View.VISIBLE);
            vh.expand_icon.setImageResource(R.drawable.ic_expand_less);
        } else {
            vh.details.setVisibility(View.GONE);
            vh.select_btn.setVisibility(View.GONE);
            vh.expand_icon.setImageResource(R.drawable.ic_expand_more);
        }
    }

    public void toggleVisibilityState(ClassCardViewHolder vh, int position) {
        // Toggle state
        expandList[position] = !expandList[position];

        // Update visibility accordingly
        updateVisibilityState(vh, position);

        // Handle animation and update data
        ObjectAnimator animation = ObjectAnimator.ofInt(vh.details, "maxLines",
                vh.details.getMaxLines());
        animation.setDuration(200).start();
        notifyDataSetChanged();
    }

    // Replace the contents of a view (invoked by the layout manager)
    @Override
    @SuppressWarnings("deprecation")
    public void onBindViewHolder(final ClassCardViewHolder vh, int pos) {
        final int position = vh.getAdapterPosition();
        vh.name.setText(this.classes[position]);
        vh.description.setText(this.getCharacterClassDescription(vh.context, position));
        if (Build.VERSION.SDK_INT >= 24) {
            vh.details.setText(Html.fromHtml(this.getCharacterClassDetails(vh.context, position),
                    FROM_HTML_MODE_LEGACY));
        } else {
            vh.details.setText(Html.fromHtml(this.getCharacterClassDetails(vh.context, position)));
        }

        // Set character class
        try {
            String characterClass = this.classes[position].toLowerCase();
            int drawableId = R.drawable.class.getField("class_" + characterClass).getInt(null);
            vh.class_icon.setImageResource(drawableId);
            vh.class_icon.setVisibility(View.VISIBLE);
        } catch (Exception e) {
            vh.class_icon.setVisibility(View.INVISIBLE);
        }

        // Set tags for current card
        vh.expand_icon.setTag(R.id.class_card_position, position);
        vh.select_btn.setTag(R.id.class_card_position, position);

        // Set up current expansion state
        updateVisibilityState(vh, position);

        /**
         * Listen to action button clicks in card view
         */

        // Update UI and not actual change in state
        vh.expand_icon.setOnClickListener(null);

        // Set up expand icon
        vh.expand_icon.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                toggleVisibilityState(vh, position);
            }
        });

        // Set up select button
        vh.select_btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                TextView tv = (TextView) view;
                Context context = view.getContext();
                Activity calling_activity = (Activity) context;

                // Get class card position from card
                int pos = (Integer) view.getTag(R.id.class_card_position);

                Character character = current.getCharacter();
                character.setCharacterClass(classes[pos]);
                current.setCharacter(character);

                // Save campaign and proceed to next activity
                if (!first_time) {
                    db.updateCampaign(current);
                    calling_activity.finish();
                    Snackbar.make(view.findViewById(R.id.class_list),
                            context.getResources().getString(R.string.finish_select_class),
                            Snackbar.LENGTH_LONG).show();
                } else {
                    current.setStatus(3);
                    db.updateCampaign(current);
                    // Intent next = new Intent(this, .class);
                    // next.putExtra("campaign_id", campaign_id);
                    // next.putExtra("first_time", true);
                    calling_activity.finish();
                    // startActivity(next);
                }
            }
        });
    }

    // Override recycler view method
    @Override
    public void onAttachedToRecyclerView(RecyclerView recyclerView) {
        super.onAttachedToRecyclerView(recyclerView);
    }

    // Return the number of classes (invoked by the layout manager)
    @Override
    public int getItemCount() {
        return this.classes.length;
    }
}
