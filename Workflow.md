# Warehouse Workflow

1. Admin open wms , and manage order from market places like Tokopedia, Shopee, Lazada, Bukalapak, TikTok Shop, etc. this wms also wiring from external ecommerce API as order management and warehousing process, this WMS also will use API to feedback to the ecommerce for updating status, stock , and item management (Big seller reference). This section should have filter and subfiltering capability to manage order like:
    a. logistic type (instant delivery / regular next day)
    b. Order Type (1 Order many sku (mix) / 1 order 1 sku small qty / 1 order 1 sku big qty)

    
2. Admin Assign Order to picker by printing the label shipping label and assigning from the wms
3. Picker got notification for assigned order
4. Picker scans the recived label picking to confirm the task as picking
5. Picker start pick and handover to rack staging packer by scans the staging rack. in this section, the data also will push the finished task order detail to packer task as available and ready to be packed
6. Packer scan the order invoice, then system shows detailed order items, packer scan item sku to validate the items, packer confirm and pack items into poly mailer,packer attach the label and mark the status as packed. in this section the system will deduct the stock on hands warehouse after packer confirmed as packed

7. Manifestation / Scanning out process, the manifester will scan the bulky proceseed orders , in this section will group orders based on logistic partners (Shopee Express, J&T, Sicepat, etc.), this section is requiered redundance scanning by scan the label shipping and scan the sotration rack to match 
